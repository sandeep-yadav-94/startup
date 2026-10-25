import express from 'express';
import {getIO} from '../socket.js';

const router = express.Router();

router.post('/emit', (req, res) => {
  if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
    return res.status(403).json({
      message:"Unauthorized"
    })
  }
  const {event, room, payload} = req.body;
  if(!event || !room || !payload){
    return res.status(400).json({
      message:"Missing required fields"
    })
  }
  console.log(`Emitting event ${event} to room ${room}`);
  getIO().to(room).emit(event, payload);
  return res.status(200).json({
    message:"Event emitted successfully"
  })
});

export default router;