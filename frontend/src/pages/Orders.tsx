import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { businessService } from "../config";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiShoppingBag,
} from "react-icons/fi";

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "reached", "picked_up"]

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

  useEffect(()=>{
  if(!socket) return;
  const onUpdateOrder = () => {
    fetchOrders();
  }
  socket.on("order:rider_assigned", onUpdateOrder);
  return ()=>{
    socket.off("order:rider_assigned", onUpdateOrder);
    }
}, [socket]);

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const completedOrders = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#F7F6F2] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="relative mb-8 overflow-hidden rounded-[2rem] bg-[#26372E] px-6 py-8 text-white shadow-xl shadow-[#26372E]/10 sm:px-10 sm:py-10">
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -right-2 -top-14 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#D9E4D9]">
                <FiShoppingBag />
                Your activity
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">My orders</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/65 sm:text-base">
                Keep track of your deliveries and revisit your order history, all in one place.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
              <OrderCount icon={<FiClock />} label="In progress" count={activeOrders.length} />
              <OrderCount icon={<FiCheckCircle />} label="Completed" count={completedOrders.length} />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 shadow-sm sm:p-12">
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-[#E9EEE9] text-2xl text-[#48644F]">
                <FiPackage />
              </span>
              <p className="mt-4 font-semibold text-[#2E3931]">Loading your orders</p>
              <p className="mt-1 text-sm text-[#858A83]">Just a moment while we get everything ready.</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#DADDD5] bg-white px-6 py-14 text-center shadow-sm sm:py-20">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF2ED] text-2xl text-[#48644F]">
              <FiShoppingBag />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-[#2E3931]">Your next favorite is one order away</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#858A83]">
              Once you place an order, its live progress and details will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-9">
            <OrderSection
              title="In progress"
              description="Updates as your order makes its way to you"
              count={activeOrders.length}
              emptyText="No active deliveries right now. Any new order will appear here."
              orders={activeOrders}
              onOrderClick={(id) => navigate(`/orders/${id}`)}
            />
            <OrderSection
              title="Your order history"
              description="Completed and past orders"
              count={completedOrders.length}
              emptyText="Your completed orders will be saved here."
              orders={completedOrders}
              onOrderClick={(id) => navigate(`/orders/${id}`)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders;

const OrderCount = ({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3.5 backdrop-blur-sm sm:p-4">
    <div className="flex items-center gap-2 text-[#D9E4D9]">
      <span className="text-base">{icon}</span>
      <span className="text-[11px] font-medium sm:text-xs">{label}</span>
    </div>
    <p className="mt-2 text-2xl font-semibold tracking-tight">{count}</p>
  </div>
);

const OrderSection = ({
  title,
  description,
  count,
  emptyText,
  orders,
  onOrderClick,
}: {
  title: string;
  description: string;
  count: number;
  emptyText: string;
  orders: IOrder[];
  onOrderClick: (id: string) => void;
}) => (
  <section>
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#2E3931] sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-[#858A83]">{description}</p>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#68746A] shadow-sm ring-1 ring-[#E9EAE5]">
        {count} {count === 1 ? "order" : "orders"}
      </span>
    </div>
    {orders.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-[#DADDD5] bg-white/70 px-5 py-7 text-center text-sm text-[#858A83]">
        {emptyText}
      </div>
    ) : (
      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderRow key={order._id} order={order} onClick={() => onOrderClick(order._id)} />
        ))}
      </div>
    )}
  </section>
);

const formatOrderDate = (date: Date | string) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
};

const OrderRow = ({ order, onClick }: { order: IOrder; onClick: () => void }) => {
  const isCanceled = order.status === "canceled";
  const isDelivered = order.status === "delivered";
  const statusLabel = order.status.replace(/_/g, " ");
  const statusStyle = isCanceled
    ? "bg-[#FCEDEA] text-[#A34D3D]"
    : isDelivered
      ? "bg-[#EAF2E9] text-[#48644F]"
      : "bg-[#FFF3DF] text-[#986527]";

  return (
    <button
      type="button"
      className="group w-full rounded-2xl border border-[#E8E6DF] bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C8D2C7] hover:shadow-lg hover:shadow-[#26372E]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#48644F] focus-visible:ring-offset-2 sm:p-5"
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F3EE] text-lg text-[#48644F]">
            <FiPackage />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#2E3931]">Order #{order._id.slice(-6).toUpperCase()}</h3>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyle}`}>
                {statusLabel}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#858A83]">{formatOrderDate(order.createdAt)}</p>
            {order.businessName && (
              <p className="mt-2 truncate text-sm font-medium text-[#526056]">{order.businessName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#F0F0EC] pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#92978F]">Total</p>
            <p className="mt-0.5 text-lg font-semibold text-[#26372E]">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(order.totalAmount)}
            </p>
          </div>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#617565] transition group-hover:text-[#26372E] sm:mt-2">
            View details <FiArrowRight className="transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
      <div className="mt-4 border-t border-[#F0F0EC] pt-3.5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#92978F]">Order items</p>
        <div className="flex flex-wrap gap-2">
          {order.services.map((item, i) => (
            <span
              key={item.serviceId || i}
              className="rounded-lg bg-[#F7F7F3] px-2.5 py-1.5 text-xs text-[#58645A]"
            >
              {item.name} <span className="font-semibold text-[#35463A]">× {item.quantity}</span>
            </span>
          ))}
        </div>
      </div>
    </button>
  );
};
