import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { riderService } from "../main";
import toast from "react-hot-toast";

interface Props{
  orderId : string;
  onResolved: () => void;
  onExpired: () => void;
}

const RiderOrderRequest = ({orderId, onResolved, onExpired}: Props) => {

  const [accepting, setAccepting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const callbacks = useRef({ onResolved, onExpired });

  useEffect(() => {
    callbacks.current = { onResolved, onExpired };
  }, [onResolved, onExpired]);

  useEffect(() => {
    if (accepting || secondsLeft === 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [accepting, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0) callbacks.current.onExpired();
  }, [secondsLeft]);

  const acceptOrder = async() => {
    if (accepting || secondsLeft === 0) return;
    setAccepting(true);
    try {
      await axios.post(`${riderService}/api/rider/accept/${orderId}`, {}, {
        headers : {
          Authorization : `Bearer ${localStorage.getItem("token")}`,
        }
      })
      toast.success("Order accepted");
      callbacks.current.onResolved();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(typeof message === "string" ? message : "Could not accept this order");
      callbacks.current.onResolved();
    }finally{
      setAccepting(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border-green-300 space-y-3">
      <p className="text-center text-xs font-semibold text-red-600">Accept within {secondsLeft}s</p>
      <p className="text-center text-xs font-semibold text-green-600">New delivery request</p>
      <p className="text-xs text-gray-600">Order Id : <b>{orderId.slice(-6)}</b></p>
      <button disabled={accepting || secondsLeft === 0} onClick={acceptOrder} className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">{accepting ? "Accepting..." : "Accept Order"}</button>
    </div>
  )
}

export default RiderOrderRequest
