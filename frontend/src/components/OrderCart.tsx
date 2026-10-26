import { useState } from "react";
import type { IOrder } from "../types"
import { ORDER_ACTIONS } from "../utils/orderflow";
import axios from "axios";
import { businessService } from "../config";
import toast from "react-hot-toast";


interface  props {
  order: IOrder;
  onStatusUpdate?: ()=> void;
}

const statusColors = (status: string) => {
  switch (status) {
    case "placed":
      return "bg-yellow-100 text-yellow-800";
    case "accepted":
      return "bg-orange-100 text-orange-800";
    case "preparing":
      return "bg-green-100 text-green-800 ";
    case "ready_for_rider":
      return "bg-indigo-100 text-indigo-800";
    case "picked_up":
      return "bg-purple-100 text-purple-800";
    case "delivered":
      return "bg-gray-100 text-gray-800";
    default:
      return status;
  }
};

const OrderCart = ({ order, onStatusUpdate }: props) => {

  const [loading, setLoading] = useState(false);

  const actions = ORDER_ACTIONS[order.status] || [];

  const updateStatus = async (status: string) => {

    try {
      setLoading(true);
      await axios.put(`${businessService}/api/order/${order._id}`, { status }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success(`Order status updated to ${status}`);
      onStatusUpdate?.();
    } catch (error) {
      setLoading(false);
      toast.error("Failed to update order status");
    }finally {
      setLoading(false);
    }

  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-md space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Order ID: #{order._id.slice(-6)}</p>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors(order.status)}`}>{order.status.replaceAll("_", " ")}</span>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        {order.services.map((item, index) => (
          <p key={index}>{item.name} x {item.quantity}</p>
        ))}
      </div>
      <div className="flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>₹{order.totalAmount}</span>
      </div>
      <p className="text-xs text-gray-400">Payment: {order.paymentStatus}</p>

      {
        order.paymentStatus === "paid" && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {actions.map((status) => (
              <button
                key={status}
                className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full hover:bg-blue-600 transition-colors"
                onClick={() => updateStatus(status)}
                disabled={loading}
              >
                Mark as {status.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        )
      }

    </div>
  )
}

export default OrderCart
