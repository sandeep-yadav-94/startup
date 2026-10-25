import { useEffect,  useRef, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";
import audio from "../assets/mangaletp-funny-laughing-406018.mp3"

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up"];

const BusinessOrders = ({businessId}: {businessId: string}) => {

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const {socket} = useSocket();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.load();
  }, []);

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        setAudioUnlocked(true);
        console.log("Audio unlocked successfully.");
      }).catch((error) => {
        console.error("Error unlocking audio:", error);
      }
    );
  }
}

return (
    <div>
      Business Orders Component
    </div>
  )
}

export default BusinessOrders
