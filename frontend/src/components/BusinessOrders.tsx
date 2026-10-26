import { useEffect,  useRef, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";
import audio from "../assets/mangaletp-funny-laughing-406018.mp3"
import axios from "axios";
import { businessService } from "../config";
import OrderCart from "./OrderCart";

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


const fetchOrders = async()=>{
  try {
  const {data} = await axios.get(`${businessService}/api/order/all/${businessId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  setOrders(data.orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
  }finally {
    setLoading(false);
  }
}

useEffect(() => {
  fetchOrders();
}, [businessId]);

useEffect(() => {
  if (!socket) return;
  const onNewOrder = ()=> {
    console.log("New order received via socket.");
    if (audioUnlocked && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
    }
    fetchOrders();
  };

  socket.on("order:new", onNewOrder);

  return () => {
    socket.off("order:new", onNewOrder);
  };
}, [socket, audioUnlocked]);

if (loading) {
  return <p className="text-center text-gray-500">Loading orders...</p>;
}


const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
const completedOrders = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));


return (
  <div className="space-y-6">
    {!audioUnlocked && (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔊</span>
          <div>
            <p className="font-medium text-blue-800">
              Enable Audio Notifications
            </p>
            <p className="text-sm text-blue-700">
              Get Notified when a new order arrives..
            </p>
          </div>
        </div>
        <button
          onClick={unlockAudio}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Enable Audio
        </button>
      </div>
    )}

    
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Active Orders</h3>
      {
        activeOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No active orders.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order) => (
              <OrderCart key={order._id} order={order} onStatusUpdate={fetchOrders} />
            ))}
          </div>
        )
      }
    </div>

    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Completed Orders</h3>
      {
        completedOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No completed orders.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedOrders.map((order) => (
              <OrderCart key={order._id} order={order} onStatusUpdate={fetchOrders} />
            ))}
          </div>
        )
      }
    </div>

  </div>
);

};

export default BusinessOrders;

