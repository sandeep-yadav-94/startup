import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { riderService } from "../main";
import toast from "react-hot-toast";
import { motion, useReducedMotion } from "framer-motion";
import { FiCheckCircle, FiClock, FiMapPin, FiTruck } from "react-icons/fi";

interface Props{
  orderId : string;
  onResolved: () => void;
  onExpired: () => void;
}

const RiderOrderRequest = ({orderId, onResolved, onExpired}: Props) => {

  const [accepting, setAccepting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const shouldReduceMotion = useReducedMotion();
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

  const countdownOffset = 2 * Math.PI * 17 * (1 - secondsLeft / 10);

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-[1.4rem] border border-[#DCE9DE] bg-white shadow-[0_16px_44px_-32px_rgba(47,86,59,0.65)]"
    >
      <div className="flex items-center justify-between gap-3 bg-[#F0F6F0] px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg text-[#557A69] shadow-sm"><FiTruck /></span>
          <div>
            <p className="text-sm font-bold text-[#344C3B]">New delivery request</p>
            <p className="mt-0.5 text-xs text-[#819087]">Nearby partner order</p>
          </div>
        </div>
        <div className="relative flex h-11 w-11 items-center justify-center">
          <svg className="-rotate-90" width="44" height="44" viewBox="0 0 44 44" aria-label={`${secondsLeft} seconds remaining`}>
            <circle cx="22" cy="22" r="17" fill="none" stroke="#DCE8DE" strokeWidth="3" />
            <circle
              cx="22"
              cy="22"
              r="17"
              fill="none"
              stroke={secondsLeft <= 3 ? "#C85D4A" : "#648B6D"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 17}
              strokeDashoffset={countdownOffset}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <span className={`absolute text-xs font-bold ${secondsLeft <= 3 ? "text-[#B84E3D]" : "text-[#45664F]"}`}>{secondsLeft}</span>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[#66736B]">
            <FiMapPin className="text-[#8D9A91]" />
            <span>Order <span className="font-semibold text-[#35463A]">#{orderId.slice(-6)}</span></span>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${secondsLeft <= 3 ? "bg-[#FFF0EC] text-[#B84E3D]" : "bg-[#F7F2E8] text-[#97723B]"}`}>
            <FiClock />
            {secondsLeft === 0 ? "Request expired" : `Accept within ${secondsLeft}s`}
          </span>
        </div>
        <button
          disabled={accepting || secondsLeft === 0}
          onClick={acceptOrder}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#557A69] px-4 text-sm font-bold text-white shadow-[0_10px_22px_-14px_rgba(63,105,78,0.8)] transition hover:-translate-y-0.5 hover:bg-[#456653] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {accepting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <FiCheckCircle />}
          {accepting ? "Accepting delivery..." : secondsLeft === 0 ? "Request expired" : "Accept delivery"}
        </button>
      </div>
    </motion.article>
  )
}

export default RiderOrderRequest
