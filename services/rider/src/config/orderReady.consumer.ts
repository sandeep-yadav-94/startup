import axios from 'axios'
import { getChannel } from './rabbitmq.js'
import { Rider } from '../model/Rider.js'


export const startOrderReadyConsumer = async() => {

  const channel = getChannel();

  console.log("starting the consume from : ", process.env.ORDER_READY_QUEUE);

  channel.consume(process.env.ORDER_READY_QUEUE!, async(msg)=>{

    if(!msg) return;

    try {
      console.log("Recieved msg", msg.content.toString());
      const event = JSON.parse(msg.content.toString());
      console.log("event type", event.type);
      if(event.type !== "ORDER_READY_FOR_RIDER"){
        console.log("Skiping non-order-ready-for-rider");
        channel.ack(msg);
        return;
      }
      const {orderId, businessId, location} = event.data;
      console.log("Searching for rider near :", location);
      const riders = await Rider.find({
          isAvailble: true,
          isVerified: true,
          location: {
            $near: {
              $geometry: location,
              $maxDistance: 500,
            },
          },
        });

        console.log(`Found ${riders.length} riders`);

        if (riders.length === 0) {
          console.log('No available verified rider within 500 meters');
          channel.ack(msg);
          return;
        }

        for(const rider of riders){

          console.log(`Notifying rider userId : ${rider.userId}`);

          await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
            event:"order:available",
            room: rider.userId,
            payload : {orderId, businessId}
          },{
            headers : {
              "x-internal-key":process.env.INTERNAL_SERVICE_KEY,
            }
          })
          console.log(`Notified rider ${rider.userId} successfully.`);

        }

        channel.ack(msg);
        console.log("message acknowldeged");

    } catch (error) {
      console.error("OrderReady consumer error; requeuing message: ", error);
      channel.nack(msg, false, true);
    }

  })

  

}