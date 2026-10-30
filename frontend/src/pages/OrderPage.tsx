import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiClock, FiCreditCard, FiMapPin, FiPackage, FiPhone, FiRefreshCw, FiShoppingBag } from "react-icons/fi";
import axios from "axios";
import { businessService } from "../config";
import { useSocket } from "../context/SocketContext";
import type { IOrder } from "../types";

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const OrderPage = () => {
  const { id } = useParams<{ id: string }>();
  const { socket } = useSocket();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setLoadError(true);
      return;
    }

    setLoading(true);
    setLoadError(false);
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${businessService}/api/order/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setOrder(data.order ?? data);
    } catch (error) {
      console.error("Error fetching order:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(fetchOrder);
  }, [fetchOrder]);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = (updatedOrder: { orderId?: string }) => {
      if (!updatedOrder.orderId || updatedOrder.orderId === id) {
        void fetchOrder();
      }
    };

    socket.on("order_update", onOrderUpdate);
    return () => {
      socket.off("order_update", onOrderUpdate);
    };
  }, [socket, id, fetchOrder]);

  useEffect(()=>{
  if(!socket) return;
  const onUpdateOrder = () => {
    void fetchOrder();
  }
  socket.on("order:rider_assigned", onUpdateOrder);
  return ()=>{
    socket.off("order:rider_assigned", onUpdateOrder);
    }
}, [socket]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-5">
          <div className="h-5 w-28 rounded bg-gray-200" />
          <div className="h-36 rounded-2xl bg-gray-200" />
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="h-72 rounded-2xl bg-gray-200" />
            <div className="h-72 rounded-2xl bg-gray-200" />
          </div>
        </div>
        <p className="sr-only">Loading order details...</p>
      </main>
    );
  }

  if (loadError || !order) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3f0] text-[#e23744]">
            <FiPackage size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Order details unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            We couldn’t load this order. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => void fetchOrder()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#e23744] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cc2f3b]"
          >
            <FiRefreshCw size={15} aria-hidden="true" />
            Try again
          </button>
          <div>
            <Link to="/orders" className="mt-4 inline-flex text-sm font-medium text-gray-600 hover:text-[#e23744]">
              Back to my orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const status = order.status === "wait for rider" ? "Waiting for rider" : formatLabel(order.status);
  const paymentStatus = formatLabel(order.paymentStatus);
  const statusIsComplete = ["paid", "delivered"].includes(order.status);

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <Link
        to="/orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#e23744]"
      >
        <FiArrowLeft size={16} aria-hidden="true" />
        Back to my orders
      </Link>

      <header className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-5 bg-gradient-to-r from-[#fff8f5] to-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a66a52]">Order details</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Order <span className="font-mono">#{order._id.slice(-6).toUpperCase()}</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Placed {new Date(order.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-[#f2ded5] bg-white px-4 py-2.5 shadow-sm">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${statusIsComplete ? "bg-green-100 text-green-700" : "bg-[#fff0eb] text-[#e23744]"}`}>
              {statusIsComplete ? <FiCheck size={15} aria-hidden="true" /> : <FiClock size={15} aria-hidden="true" />}
            </span>
            <span className="text-sm font-semibold text-gray-800">{status}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-3.5 text-sm text-gray-500 sm:px-7">
          <FiShoppingBag className="shrink-0 text-[#af6028]" size={17} aria-hidden="true" />
          <span>Order from</span>
          <span className="truncate font-semibold text-gray-800">{order.businessName}</span>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Items ordered</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {order.services.length} {order.services.length === 1 ? "item" : "items"} in your order
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4ef] text-[#af6028]">
                <FiPackage size={19} aria-hidden="true" />
              </span>
            </div>

            <div className="mt-5 divide-y divide-gray-100">
              {order.services.map((item, index) => {
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;

                return (
                  <div key={`${item.serviceId}-${index}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800">{item.name}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatCurrency(price)} <span className="px-1 text-gray-300">×</span> {quantity}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-gray-900">{formatCurrency(price * quantity)}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7f3ed] text-[#af6028]">
                <FiMapPin size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Delivery address</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {order.deliveryAddress.formattedAddress}
                </p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FiPhone size={15} className="text-gray-400" aria-hidden="true" />
                  {order.deliveryAddress.mobile}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Bill summary</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4 text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-800">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4 text-gray-600">
                <span>Delivery fee</span>
                <span className="font-medium text-gray-800">{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between gap-4 text-gray-600">
                <span>Platform fee</span>
                <span className="font-medium text-gray-800">{formatCurrency(order.platformFee)}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Payment</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <FiCreditCard size={19} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{formatLabel(order.paymentMethod)}</p>
                <p className="mt-0.5 text-xs text-gray-500">Payment method</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm text-gray-500">Payment status</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.paymentStatus === "paid" ? "bg-green-50 text-green-700" : order.paymentStatus === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                {paymentStatus}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default OrderPage;
