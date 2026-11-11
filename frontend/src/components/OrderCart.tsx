import { useEffect, useState } from "react";
import type { IOrder } from "../types"
import { ORDER_ACTIONS } from "../utils/orderflow";
import axios from "axios";
import { businessService } from "../config";
import toast from "react-hot-toast";
import { FiArrowUpRight, FiCalendar, FiMapPin } from "react-icons/fi";


interface  props {
  order: IOrder;
  onStatusUpdate?: ()=> void;
}

const statusColors = (status: string) => {
  switch (status) {
    case "placed":
      return "border-[#f0dfb8] bg-[#fff9eb] text-[#927027]";
    case "accepted":
      return "border-[#f0ddca] bg-[#fff6ed] text-[#a4612d]";
    case "preparing":
      return "border-[#cfe6d4] bg-[#f0f8f1] text-[#438353]";
    case "ready_for_rider":
      return "border-[#d7d9f0] bg-[#f3f3fb] text-[#6969a3]";
    case "reached":
      return "border-[#d4e2ed] bg-[#f0f6fa] text-[#51799a]";
    case "picked_up":
      return "border-[#e1d8ed] bg-[#f7f3fb] text-[#79639b]";
    case "delivered":
      return "border-[#dce5de] bg-[#f3f7f3] text-[#62776a]";
    case "canceled":
      return "border-[#eed5d2] bg-[#fdf4f3] text-[#a4564c]";
    default:
      return "border-[#e5e9e5] bg-[#f7f8f6] text-[#737d76]";
  }
};

const OrderCart = ({ order, onStatusUpdate }: props) => {

  const [loading, setLoading] = useState(false);

  const [ retryVisible, setRetryVisible] = useState(false)
  const [retryCycle, setRetryCycle] = useState(0);

  const actions = ORDER_ACTIONS[order.status] || [];

  useEffect(()=>{

    if(order.status !== "ready_for_rider"){
      return;
    }

    const timer = setTimeout(()=>{
      setRetryVisible(true)
    }, 10000)

    return ()=> clearTimeout(timer);

  }, [order.status, retryCycle]);

  const updateStatus = async (status: string) => {

    try {
      setLoading(true);
      setRetryVisible(false);
      await axios.put(`${businessService}/api/order/${order._id}`, { status }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success(`Order status updated to ${status}`);
      if (status === "ready_for_rider") {
        setRetryCycle((cycle) => cycle + 1);
      }
      onStatusUpdate?.();
    } catch (error: unknown) {
      console.error("Failed to update order status:", error);
      setRetryVisible(order.status === "ready_for_rider");
      setLoading(false);
      toast.error("Failed to update order status");
    }finally {
      setLoading(false);
    }

  }

  const createdAt = new Date(order.createdAt);
  const dateLabel = Number.isNaN(createdAt.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(createdAt);

  return (
    <article className="overflow-hidden rounded-lg border border-[#e5e9e5] bg-white transition hover:border-[#d5ddd6]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0ed] px-4 py-3.5">
        <div>
          <p className="font-mono text-xs font-semibold text-[#354039]">#{order._id.slice(-8).toUpperCase()}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#818a83]"><FiCalendar size={12} />{dateLabel}</p>
        </div>
        <span className={`rounded-md border px-2.5 py-1 text-[10px] font-bold capitalize tracking-wide ${statusColors(order.status)}`}>{order.status.replaceAll("_", " ")}</span>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#303a33]">{order.customerName || "Customer"}</p>
            <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-[#818a83]"><FiMapPin className="mt-0.5 shrink-0" size={12} />{order.deliveryAddress?.formattedAddress || "Address unavailable"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-[#303a33]">₹{Number(order.subtotal || 0).toLocaleString("en-IN")}</p>
            <p className="mt-0.5 text-[10px] text-[#818a83]">Item sales</p>
          </div>
        </div>

        <div className="space-y-1.5 border-y border-[#edf0ed] py-3">
          {order.services.map((item, index) => (
            <div key={`${item.serviceId}-${index}`} className="flex justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-[#626c65]">{item.name} <span className="text-[#929a94]">× {item.quantity}</span></span>
              <span className="shrink-0 text-[#626c65]">₹{(Number(item.price) * Number(item.quantity)).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#818a83]">Payment</span>
          <span className={`font-semibold capitalize ${order.paymentStatus === "paid" ? "text-[#438353]" : "text-[#a4612d]"}`}>{order.paymentStatus}</span>
        </div>

      {
        order.paymentStatus === "paid" && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {actions.map((status) => (
              <button
                key={status}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#26312a] px-3 py-2 text-xs font-semibold capitalize text-white transition-colors hover:bg-[#3b4a3f] disabled:opacity-60"
                onClick={() => updateStatus(status)}
                disabled={loading}
              >
                {loading ? "Updating..." : <>Mark {status.replaceAll("_", " ")} <FiArrowUpRight size={13} /></>}
              </button>
            ))}
          </div>
        )
      }

      {
        order.status === "ready_for_rider" && retryVisible && <div className="pt-2">
          <button className="w-full rounded-md border border-[#eed5d2] py-2 text-xs font-semibold text-[#a4564c] hover:bg-[#fdf4f3] disabled:opacity-50" onClick={()=>updateStatus("ready_for_rider")} disabled={loading}>Retry rider request</button>
        </div>
      }

      </div>
    </article>
  )
}

export default OrderCart
