import amqp from 'amqplib';

let channel : amqp.Channel;

export const connectRabbitMQ = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
  channel = await connection.createChannel();
  await channel.assertQueue(process.env.ORDER_READY_QUEUE!, { durable: true });
  console.log('Connected to RabbitMQ (rider service)');
  return channel;
}

export const getChannel = () => channel;