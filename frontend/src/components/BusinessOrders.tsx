import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FiAlertCircle, FiArrowUpRight, FiCalendar, FiCheckCircle, FiClock, FiDollarSign, FiRefreshCw, FiSearch, FiShoppingBag, FiTrendingUp } from "react-icons/fi";
import { businessService } from "../config";
import { useSocket } from "../context/SocketContext";
import type { IOrder } from "../types";
import audio from "../assets/mangaletp-funny-laughing-406018.mp3";
import OrderCart from "./OrderCart";

type BookingFilter = "all" | "active" | "completed" | "cancelled";

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready_for_rider", "wait for rider", "rider_assigned", "reached", "picked_up"];
const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(amount);

const getBookingLoadError = (error: unknown) => {
  if (!axios.isAxiosError<{ message?: string }>(error)) {
    return "An unexpected error prevented your bookings from loading.";
  }
  if (!error.response) {
    return `Can't reach the booking service at ${businessService}. Make sure the business service is running, then try again.`;
  }
  if (error.response.status === 401) {
    const message = error.response.data?.message;
    return typeof message === "string" && message
      ? `The booking service rejected your sign-in: ${message}. Sign in again if needed.`
      : "The booking service rejected your sign-in. Please sign in again.";
  }
  if (error.response.status === 403) {
    return "Your merchant account isn't authorized to view these bookings.";
  }
  const serverMessage = error.response.data?.message;
  return typeof serverMessage === "string" && serverMessage
    ? `Bookings couldn't load: ${serverMessage}`
    : `Bookings couldn't load (HTTP ${error.response.status}). Please try again.`;
};

const BusinessOrders = ({ businessId }: { businessId: string }) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [filter, setFilter] = useState<BookingFilter>("all");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const { socket } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio);
    audioRef.current.load();
  }, []);

  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token?.trim()) {
      setLoadError("No sign-in token was found. Sign in again to view your bookings.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data } = await axios.get(`${businessService}/api/order/all/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data.orders || []);
      setLoadError("");
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        console.error("Error fetching bookings:", {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
      } else {
        console.error("Unexpected error fetching bookings:", error);
      }
      setLoadError(getBookingLoadError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    void Promise.resolve().then(fetchOrders);
  }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const onNewOrder = () => {
      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((error) => console.error("Error playing audio:", error));
      }
      fetchOrders();
    };
    const onUpdateOrder = () => fetchOrders();
    socket.on("order:new", onNewOrder);
    socket.on("order:rider_assigned", onUpdateOrder);
    socket.on("order_update", onUpdateOrder);
    return () => {
      socket.off("order:new", onNewOrder);
      socket.off("order:rider_assigned", onUpdateOrder);
      socket.off("order_update", onUpdateOrder);
    };
  }, [socket, audioUnlocked, fetchOrders]);

  const today = new Date();
  const todaysOrders = orders.filter((order) => {
    const created = new Date(order.createdAt);
    return created.toDateString() === today.toDateString();
  });
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const completedOrders = orders.filter((order) => order.status === "delivered");
  const cancelledOrders = orders.filter((order) => order.status === "canceled");
  const grossSales = orders.reduce((total, order) => total + Number(order.subtotal || 0), 0);
  const todaysSales = todaysOrders.reduce((total, order) => total + Number(order.subtotal || 0), 0);
  const averageOrder = orders.length ? grossSales / orders.length : 0;

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter = filter === "all"
        || (filter === "active" && ACTIVE_STATUSES.includes(order.status))
        || (filter === "completed" && order.status === "delivered")
        || (filter === "cancelled" && order.status === "canceled");
      const matchesSearch = !query
        || order._id.toLowerCase().includes(query)
        || (order.customerName || "").toLowerCase().includes(query)
        || order.services.some((service) => service.name.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [orders, filter, search]);

  const unlockAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.play().then(() => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
    }).catch((error) => console.error("Error enabling order notifications:", error));
  };

  const refresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-[#737d76]">Loading your booking workspace...</div>;
  }

  const filterOptions: { key: BookingFilter; label: string; count: number }[] = [
    { key: "all", label: "All bookings", count: orders.length },
    { key: "active", label: "In progress", count: activeOrders.length },
    { key: "completed", label: "Completed", count: completedOrders.length },
    { key: "cancelled", label: "Cancelled", count: cancelledOrders.length },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-lg border border-[#e5e9e5] bg-white p-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#AF6028]">BOOKING MANAGEMENT</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#26312a]">Your bookings</h2>
          <p className="mt-1 text-sm text-[#737d76]">Track orders, manage fulfillment, and keep an eye on sales.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!audioUnlocked && (
            <button type="button" onClick={unlockAudio} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e5e9e5] px-3 text-xs font-semibold text-[#566159] transition hover:bg-[#f7f8f6]">
              Enable order alerts
            </button>
          )}
          <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e5e9e5] px-3 text-xs font-semibold text-[#566159] transition hover:bg-[#f7f8f6] disabled:opacity-60">
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} size={14} /> Refresh
          </button>
        </div>
      </section>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-[#f1d2cc] bg-[#fff8f6] px-4 py-3 text-sm text-[#9b493c]">
          <span className="flex items-center gap-2"><FiAlertCircle />{loadError}</span>
          <button type="button" onClick={refresh} className="shrink-0 font-semibold underline underline-offset-2">Try again</button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross sales" value={formatCurrency(grossSales)} note="Merchant item totals on paid orders" icon={<FiDollarSign />} accent="brown" />
        <MetricCard label="Sales today" value={formatCurrency(todaysSales)} note={`${todaysOrders.length} booking${todaysOrders.length === 1 ? "" : "s"} today`} icon={<FiTrendingUp />} accent="green" />
        <MetricCard label="In progress" value={String(activeOrders.length)} note="Bookings needing attention" icon={<FiClock />} accent="blue" />
        <MetricCard label="Average booking" value={formatCurrency(averageOrder)} note={`${completedOrders.length} completed booking${completedOrders.length === 1 ? "" : "s"}`} icon={<FiCheckCircle />} accent="purple" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="rounded-lg border border-[#e5e9e5] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#AF6028]">EARNINGS OVERVIEW</p>
              <h3 className="mt-1 text-lg font-semibold text-[#26312a]">Paid order sales</h3>
            </div>
            <span className="rounded-md bg-[#f7f5f1] px-2.5 py-1.5 text-[11px] font-medium text-[#7b6a58]">All time</span>
          </div>
          <p className="mt-5 text-3xl font-semibold tracking-tight text-[#26312a]">{formatCurrency(grossSales)}</p>
          <p className="mt-1 text-xs leading-5 text-[#737d76]">Based on item subtotals for paid bookings. Delivery and platform fees are excluded.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf0ed] pt-4">
            <div>
              <p className="text-xs text-[#818a83]">Today</p>
              <p className="mt-1 text-sm font-semibold text-[#26312a]">{formatCurrency(todaysSales)}</p>
            </div>
            <div>
              <p className="text-xs text-[#818a83]">Total paid bookings</p>
              <p className="mt-1 text-sm font-semibold text-[#26312a]">{orders.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#e5e9e5] bg-[#26312a] p-5 text-white sm:p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-[#e9ad7e]"><FiArrowUpRight size={19} /></div>
          <p className="mt-5 text-[10px] font-bold tracking-[0.14em] text-white/55">PAYOUTS</p>
          <h3 className="mt-1 text-lg font-semibold">Payout tracking unavailable</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">This payment setup doesn’t provide payout or settlement records yet. Sales shown here are not a confirmed withdrawable balance.</p>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/75"><FiCalendar size={14} /> Settlement details will appear when connected.</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#e5e9e5] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#edf0ed] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#AF6028]">BOOKING ACTIVITY</p>
              <h3 className="mt-1 text-lg font-semibold text-[#26312a]">Recent bookings</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#737d76]"><FiShoppingBag size={14} />{orders.length} total</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {filterOptions.map((option) => (
                <button key={option.key} type="button" onClick={() => setFilter(option.key)} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${filter === option.key ? "bg-[#26312a] text-white" : "text-[#737d76] hover:bg-[#f4f6f3]"}`}>
                  {option.label}<span className={filter === option.key ? "text-white/65" : "text-[#9ba39d]"}>{option.count}</span>
                </button>
              ))}
            </div>
            <label className="flex h-10 w-full items-center gap-2 rounded-md border border-[#e5e9e5] px-3 text-[#89928b] focus-within:border-[#af6028] lg:max-w-64">
              <FiSearch size={15} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bookings" aria-label="Search bookings" className="min-w-0 flex-1 bg-transparent text-xs text-[#26312a] outline-none placeholder:text-[#9ba39d]" />
            </label>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f6f3] text-[#89928b]"><FiShoppingBag size={20} /></span>
              <p className="mt-4 text-sm font-semibold text-[#39443c]">{orders.length ? "No bookings match this view" : "No bookings yet"}</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#818a83]">{orders.length ? "Try another status filter or search term." : "New paid orders will show up here as soon as a customer books."}</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleOrders.map((order) => <OrderCart key={order._id} order={order} onStatusUpdate={fetchOrders} />)}
            </div>
          )}
        </div>
        <div className="flex items-start gap-2 border-t border-[#edf0ed] bg-[#fafbf9] px-5 py-3.5 text-[11px] leading-5 text-[#818a83] sm:px-6">
          <FiAlertCircle className="mt-0.5 shrink-0" size={14} />
          <p>Sales are calculated from paid orders currently available in your booking history. Payout settlement, fees, and bank transfer status are not supplied by the payment service.</p>
        </div>
      </section>
    </div>
  );
};

const MetricCard = ({ label, value, note, icon, accent }: { label: string; value: string; note: string; icon: React.ReactNode; accent: string }) => {
  const accents: Record<string, string> = {
    brown: "bg-[#f8f1eb] text-[#a75f30]",
    green: "bg-[#edf6ef] text-[#438353]",
    blue: "bg-[#eef3f8] text-[#58799b]",
    purple: "bg-[#f3f0f7] text-[#78639a]",
  };
  return (
    <div className="rounded-lg border border-[#e5e9e5] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#737d76]">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${accents[accent]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#26312a]">{value}</p>
      <p className="mt-1 text-[11px] text-[#89928b]">{note}</p>
    </div>
  );
};

export default BusinessOrders;
