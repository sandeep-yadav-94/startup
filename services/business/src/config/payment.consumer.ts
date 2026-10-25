import axios from 'axios';
import Order from '../models/Order.js';
import {getChannel} from './rabbitmq.js'

export const startPaymentConsumer = async () => {
  const channel = getChannel();
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }
  channel.consume(process.env.PAYMENT_QUEUE!, async (msg) => {
    if(!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      if(event.type !== "PAYMENT_SUCCESS") {
        console.warn(`Received unknown event type: ${event.type}`);
        channel.ack(msg);
        return;
      }
      const { orderId} = event.data;
      const order = await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: { $ne: "paid" } },
        {
          $set: { paymentStatus: "paid", status: "placed" },
          $unset: { expireAt: 1 }
        },
        { new: true }
      );
      if (!order) {
        console.warn(`Order not found for ID: ${orderId}`);
        channel.ack(msg);
        return;
      }
      console.log(`Order updated successfully for ID: ${orderId}`);

      //socket io ka code yaha pe likhna hai
      await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
        event: "new order",
        room: `business:${order.businessId}`,
        payload: {
          orderId: order._id.toString(),
        }
      }, {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY
        }
      });

      channel.ack(msg);

    } catch (error) {
      console.error("Error processing payment message:", error);
    }
  });
  
  console.log("Payment consumer started and listening for messages...");
}