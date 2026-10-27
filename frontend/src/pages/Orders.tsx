import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { businessService } from "../config";

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up"]

const Orders = () => {

  const [orders, setOrders] = useState< IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const {socket} = useSocket();

  const fetchOrders = async () => {
    try {
      const {data} = await axios.get(`${businessService}/api/order/my`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchOrders();
  }, []);


  useEffect(() => {
    if(!socket) return;
    const onOrderUpdate = () => {
      fetchOrders();
    }
    socket.on("order_update", onOrderUpdate);

    return () => {
      socket.off("order_update", onOrderUpdate);
    }
  }, [socket]);

  if(loading){
    return (
      <div className="text-center text-gray-500 text-lg mt-10">
        Loading...
      </div>
    )
  }

  if(orders.length === 0){
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500 text-lg">
        No orders yet.
      </div>
    )
  }

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const completedOrders = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Active Orders</h2>
        {
          activeOrders.length === 0 ? (
            <p className="text-gray-500">No active orders.</p>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderRow key={order._id} order={order} onClick={() => navigate(`/orders/${order._id}`)} />
              ))}
            </div>
          )
        }
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Completed Orders</h2>
        {
          completedOrders.length === 0 ? (
            <p className="text-gray-500">No completed orders.</p>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <OrderRow key={order._id} order={order} onClick={() => navigate(`/orders/${order._id}`)} />
              ))}
            </div>
          )
        }
      </section>
    </div>
  )
}

export default Orders;


const OrderRow = ({order, onClick}: {order: IOrder, onClick: () => void}) => {

  return <div className="cursor-pointer rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50" onClick={onClick}>
    <div className="flex justify-between items-center ">
      <p className="text-sm font-medium">Order #{order._id.slice(-6)}</p>
      <span className="text-xs capitalize text-gray-500 ">{order.status}</span>
    </div>
    <div className="mt-2 text-sm text-gray-600">
     {order.services.map((item, i) => (
    <span key={item.serviceId || i}>
      {item.name} x {item.quantity}
      {i < order.services.length - 1 && ", "}
    </span>
  ))}
    </div>

    <div className="mt-2 flex justify-between text-sm font-medium">
  <span>Total</span>
  <span>₹{order.totalAmount}</span>
</div>

  </div>
}
