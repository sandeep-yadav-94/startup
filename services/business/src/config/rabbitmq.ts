import amqp from "amqplib";

let channel: amqp.Channel | undefined;
let reconnectTimer: NodeJS.Timeout | undefined;
let connecting = false;

const RECONNECT_DELAY_MS = 5000;

type OnConnected = () => Promise<void> | void;

const scheduleReconnect = (onConnected?: OnConnected) => {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    void openConnection(onConnected);
  }, RECONNECT_DELAY_MS);
};

const openConnection = async (onConnected?: OnConnected): Promise<void> => {
  if (connecting) return;
  connecting = true;

  let nextChannel: amqp.Channel | undefined;
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    connection.on("error", (error) => console.error("RabbitMQ connection error (business service):", error));

    nextChannel = await connection.createChannel();
    nextChannel.on("error", (error) => console.error("RabbitMQ channel error (business service):", error));

    const handleClose = () => {
      if (channel !== nextChannel) return;
      channel = undefined;
      connecting = false;
      console.warn("RabbitMQ connection closed (business service); reconnecting shortly.");
      scheduleReconnect(onConnected);
    };
    connection.on("close", handleClose);
    nextChannel.on("close", handleClose);

    await nextChannel.assertQueue(process.env.PAYMENT_QUEUE!, { durable: true });
    await nextChannel.assertQueue(process.env.ORDER_READY_QUEUE!, { durable: true });
    channel = nextChannel;
    connecting = false;

    await onConnected?.();
    console.log("Connected to RabbitMQ (business service)");
  } catch (error) {
    if (channel === nextChannel) channel = undefined;
    connecting = false;
    console.error("Unable to initialize RabbitMQ (business service); retrying shortly:", error);
    if (nextChannel) {
      await nextChannel.close().catch((closeError) => {
        console.error("Unable to close failed RabbitMQ channel (business service):", closeError);
      });
    }
    scheduleReconnect(onConnected);
  }
};

export const connectRabbitMQ = (onConnected?: OnConnected): void => {
  void openConnection(onConnected);
};

export const getChannel = (): amqp.Channel | undefined => channel;
