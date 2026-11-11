import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiActivity,
  FiBarChart2,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiLogOut,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiShield,
  FiTruck,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { adminService } from "../config";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

type ReviewTab = "pending" | "verified";

interface VerificationCounts {
  pendingBusinesses: number;
  verifiedBusinesses: number;
  pendingRiders: number;
  verifiedRiders: number;
}

interface BusinessReview {
  id: string;
  name: string;
  description: string;
  image: string;
  phone: number | string;
  address: string;
  isVerified: boolean;
  createdAt: string;
  owner?: { name: string; email: string };
}

interface RiderReview {
  id: string;
  picture: string;
  phoneNumber: string;
  aadhaarNumber?: string | null;
  drivingLicenseNumber?: string | null;
  isAvailble: boolean;
  isBusy?: boolean;
  isVerified: boolean;
  createdAt: string;
  user?: { name: string; email: string };
}

interface VerificationResponse {
  counts: VerificationCounts;
  businesses: BusinessReview[];
  riders: RiderReview[];
}

interface DashboardResponse {
  rangeDays: number;
  summary: {
    orders: number;
    paidOrders: number;
    grossSales: number;
    platformEarnings: number;
    users: number;
    customers: number;
    newUsers: number;
    businesses: number;
    riders: number;
  };
  performance: {
    orders: number;
    paidOrders: number;
    grossSales: number;
    platformEarnings: number;
    pendingPayments: number;
    canceledOrders: number;
    previousGrossSales: number;
    previousPlatformEarnings: number;
  };
  trends: Array<{ date: string; orders: number; sales: number; earnings: number }>;
  topBusinesses: Array<{ name: string; orders: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    businessName: string;
    customerName: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
  }>;
}

interface AdminOrderDetails {
  order: {
    id: string;
    userId: string;
    customerName?: string;
    businessId: string;
    businessName: string;
    riderId?: string | null;
    riderUserId?: string | null;
    riderPhone?: string | null;
    riderName?: string | null;
    distance: number;
    riderAmount: number;
    services: Array<{ serviceId: string; name: string; price: number | string; quantity: number | string }>;
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;
    addressId: string;
    deliveryAddress: {
      formattedAddress: string;
      mobile: string;
      latitude: number;
      longitude: number;
    };
    status: string;
    reachedAt?: string | null;
    pickedUpAt?: string | null;
    deliveredAt?: string | null;
    paymentMethod: string;
    paymentStatus: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  customer: AdminPerson | null;
  merchant: {
    id: string;
    name: string;
    ownerId: string;
    description?: string;
    image: string;
    phone: number;
    address?: string;
    location?: number[];
    isOpen?: boolean;
    isVerified: boolean;
    createdAt: string;
    updatedAt?: string;
    owner: AdminPerson | null;
  } | null;
  rider: {
    id: string;
    user: AdminPerson | null;
    picture: string;
    phoneNumber: string;
    riderType?: string;
    aadhaarNumber?: string;
    drivingLicenseNumber?: string;
    idProofFront?: string;
    idProofBack?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    upiQrCode?: string;
    isVerified: boolean;
    isAvailable: boolean;
    isBusy?: boolean;
    lastActiveAt?: string;
    createdAt: string;
    updatedAt?: string;
  } | null;
}

interface AdminPerson {
  name: string;
  email: string;
  image?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

type ReviewAction = { type: "business" | "rider"; id: string } | null;

const emptyCounts: VerificationCounts = {
  pendingBusinesses: 0,
  verifiedBusinesses: 0,
  pendingRiders: 0,
  verifiedRiders: 0,
};

const getErrorMessage = (error: unknown) =>
  axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || "Could not complete the request."
    : "Could not complete the request.";

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const maskNumber = (value: string | null | undefined) =>
  typeof value !== "string" || value.length === 0
    ? "Not provided"
    : `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;

const AdminDashboard = () => {
  const { setIsAuth, setUser } = useAppData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReviewTab>("pending");
  const [data, setData] = useState<VerificationResponse>({
    counts: emptyCounts,
    businesses: [],
    riders: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<ReviewAction>(null);
  const [revealedRiders, setRevealedRiders] = useState<Set<string>>(new Set());
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(7);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (days: number) => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const { data: response } = await axios.get<DashboardResponse>(
        `${adminService}/api/admin/dashboard`,
        {
          params: { days },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setDashboard(response);
    } catch (error: unknown) {
      console.error("Failed to load dashboard analytics:", error);
      setDashboardError(getErrorMessage(error));
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async (status: ReviewTab) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: response } = await axios.get<VerificationResponse>(
        `${adminService}/api/admin/verification`,
        {
          params: { status },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setData(response);
    } catch (error: unknown) {
      console.error("Failed to load verification queue:", error);
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchReviews(tab));
  }, [fetchReviews, tab]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchDashboard(rangeDays));
  }, [fetchDashboard, rangeDays]);

  const updateVerification = async (
    type: "business" | "rider",
    id: string,
    isVerified: boolean,
  ) => {
    setAction({ type, id });
    try {
      await axios.patch(
        `${adminService}/api/admin/${type === "business" ? "businesses" : "riders"}/${id}/verification`,
        { isVerified },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      toast.success(
        `${type === "business" ? "Business" : "Rider"} ${isVerified ? "verified" : "verification revoked"}.`,
      );
      await fetchReviews(tab);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setAction(null);
    }
  };

  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.businesses.filter((business) =>
      [business.name, business.owner?.name, business.owner?.email, business.address]
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [data.businesses, search]);

  const filteredRiders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.riders.filter((rider) =>
      [rider.user?.name, rider.user?.email, rider.phoneNumber]
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [data.riders, search]);

  const pendingTotal = data.counts.pendingBusinesses + data.counts.pendingRiders;

  return (
    <main className="min-h-screen bg-[#F4F5F0] text-[#302A24]">
      <header className="border-b border-white/10 bg-[#25211D] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#AF6028] text-xl">
              <FiShield aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#DDA77D]">Sushmap</p>
              <h1 className="text-xl font-semibold">Admin workspace</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Restricted administrator access
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              setUser(null);
              setIsAuth(false);
              navigate("/login", { replace: true });
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <FiLogOut aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-7 sm:py-10">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#AF6028]">Your business at a glance</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Platform overview
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746C63]">
              Revenue, orders, growth and network health—all in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void fetchDashboard(rangeDays);
              void fetchReviews(tab);
            }}
            disabled={loading || dashboardLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#E2DDD5] bg-white px-4 text-sm font-semibold text-[#403931] transition hover:border-[#AF6028] disabled:opacity-60 md:self-auto"
          >
            <FiRefreshCw className={loading || dashboardLoading ? "animate-spin" : ""} />
            Refresh dashboard
          </button>
        </section>

        {dashboardError ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 shrink-0 text-lg" />
              <div>
                <p className="font-semibold">Analytics couldn’t load</p>
                <p className="mt-1">{dashboardError}</p>
                <button type="button" onClick={() => void fetchDashboard(rangeDays)} className="mt-3 font-semibold underline underline-offset-4">
                  Try again
                </button>
              </div>
            </div>
          </section>
        ) : dashboardLoading && !dashboard ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-white" />)}
          </div>
        ) : dashboard ? (
          <AnalyticsDashboard
            data={dashboard}
            days={rangeDays}
            onRangeChange={setRangeDays}
            loading={dashboardLoading}
          />
        ) : null}

        <OrderLookup />

        <section className="flex flex-col justify-between gap-3 pt-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#AF6028]">Trust & safety</p>
            <h3 className="mt-1 text-2xl font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Verification center
            </h3>
            <p className="mt-1 text-sm text-[#746C63]">Review business and rider profiles before they join the Sushmap network.</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchReviews(tab)}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#E2DDD5] bg-white px-4 text-sm font-semibold text-[#403931] transition hover:border-[#AF6028] disabled:opacity-60 sm:self-auto"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh queue
          </button>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Awaiting review" value={pendingTotal} icon={<FiClock />} accent="amber" />
          <StatCard label="Verified businesses" value={data.counts.verifiedBusinesses} icon={<FiCheckCircle />} accent="green" />
          <StatCard label="Verified riders" value={data.counts.verifiedRiders} icon={<FiCheckCircle />} accent="green" />
          <StatCard label="Business applications" value={data.counts.pendingBusinesses} icon={<FiUsers />} accent="orange" />
          <StatCard label="Rider applications" value={data.counts.pendingRiders} icon={<FiTruck />} accent="blue" />
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#E8E2D9] bg-white shadow-[0_20px_65px_-48px_rgba(48,42,36,0.5)]">
          <div className="flex flex-col gap-4 border-b border-[#EEEAE4] p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 rounded-xl bg-[#F5F3EF] p-1">
              <TabButton active={tab === "pending"} onClick={() => setTab("pending")} label="Needs review" count={pendingTotal} />
              <TabButton
                active={tab === "verified"}
                onClick={() => setTab("verified")}
                label="Verified"
                count={data.counts.verifiedBusinesses + data.counts.verifiedRiders}
              />
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E8E2D9] px-3 text-[#8B8177] focus-within:border-[#AF6028] lg:w-80">
              <FiSearch aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or location"
                className="w-full bg-transparent text-sm text-[#302A24] outline-none placeholder:text-[#A69D93]"
              />
            </label>
          </div>

          {loadError ? (
            <div className="p-10 text-center">
              <FiAlertCircle className="mx-auto text-3xl text-red-500" />
              <p className="mt-3 font-semibold text-[#403931]">Couldn’t load the verification queue</p>
              <p className="mt-1 text-sm text-[#746C63]">{loadError}</p>
              <button onClick={() => void fetchReviews(tab)} className="mt-4 text-sm font-semibold text-[#AF6028]">
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-[#F4F2EE]" />)}
            </div>
          ) : (
            <div className="space-y-8 p-4 sm:p-6">
              <ReviewSection
                title="Businesses"
                description="Business identity, contact and location"
                count={filteredBusinesses.length}
                emptyText="No business applications in this view."
              >
                {filteredBusinesses.map((business) => (
                  <article key={business.id} className="overflow-hidden rounded-2xl border border-[#E9E4DC] bg-white">
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                      <img
                        src={business.image}
                        alt=""
                        className="h-24 w-full rounded-xl bg-[#F4F2EE] object-cover sm:h-24 sm:w-32"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="text-lg font-semibold text-[#302A24]">{business.name}</h4>
                            <p className="mt-1 text-sm text-[#746C63]">{business.description || "No description provided"}</p>
                          </div>
                          <StatusBadge verified={business.isVerified} />
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-[#62594F] sm:grid-cols-2">
                          <p><span className="font-semibold text-[#403931]">Owner</span> · {business.owner?.name || "Unknown"}{business.owner?.email ? ` · ${business.owner.email}` : ""}</p>
                          <p><span className="font-semibold text-[#403931]">Phone</span> · {business.phone}</p>
                          <p className="inline-flex gap-1.5 sm:col-span-2"><FiMapPin className="mt-0.5 shrink-0 text-[#AF6028]" />{business.address}</p>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0ECE6] pt-3">
                          <span className="text-xs text-[#8B8177]">Submitted {formatDate(business.createdAt)}</span>
                          <VerificationButton
                            verified={business.isVerified}
                            loading={action?.type === "business" && action.id === business.id}
                            onClick={() => void updateVerification("business", business.id, !business.isVerified)}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </ReviewSection>

              <ReviewSection
                title="Riders"
                description="Rider profile and identity details"
                count={filteredRiders.length}
                emptyText="No rider applications in this view."
              >
                {filteredRiders.map((rider) => {
                  const revealed = revealedRiders.has(rider.id);
                  return (
                    <article key={rider.id} className="overflow-hidden rounded-2xl border border-[#E9E4DC] bg-white">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                        <img
                          src={rider.picture}
                          alt=""
                          className="h-24 w-24 rounded-2xl bg-[#F4F2EE] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="text-lg font-semibold text-[#302A24]">{rider.user?.name || "Rider applicant"}</h4>
                              <p className="mt-1 text-sm text-[#746C63]">{rider.user?.email || "Account email unavailable"}</p>
                            </div>
                            <StatusBadge verified={rider.isVerified} />
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-[#62594F] sm:grid-cols-2">
                            <p><span className="font-semibold text-[#403931]">Phone</span> · {rider.phoneNumber}</p>
                            <p><span className="font-semibold text-[#403931]">Availability</span> · {rider.isBusy ? "Busy" : rider.isAvailble ? "Online" : "Offline"}</p>
                            <p><span className="font-semibold text-[#403931]">Aadhaar</span> · {revealed ? rider.aadhaarNumber || "Not provided" : maskNumber(rider.aadhaarNumber)}</p>
                            <p><span className="font-semibold text-[#403931]">Driving licence</span> · {revealed ? rider.drivingLicenseNumber || "Not provided" : maskNumber(rider.drivingLicenseNumber)}</p>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0ECE6] pt-3">
                            <button
                              type="button"
                              onClick={() => setRevealedRiders((current) => {
                                const next = new Set(current);
                                if (next.has(rider.id)) next.delete(rider.id);
                                else next.add(rider.id);
                                return next;
                              })}
                              className="text-xs font-semibold text-[#746C63] underline decoration-[#D9C9B9] underline-offset-4"
                            >
                              {revealed ? "Hide identity numbers" : "Reveal identity numbers"}
                            </button>
                            <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                              <span className="text-xs text-[#8B8177]">Submitted {formatDate(rider.createdAt)}</span>
                              <VerificationButton
                                verified={rider.isVerified}
                                loading={action?.type === "rider" && action.id === rider.id}
                                onClick={() => void updateVerification("rider", rider.id, !rider.isVerified)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </ReviewSection>
            </div>
          )}
        </section>
        <p className="text-center text-xs text-[#9A9188]">Admin actions are restricted to the configured administrator account.</p>
      </div>
    </main>
  );
};

const OrderLookup = () => {
  const [orderId, setOrderId] = useState("");
  const [details, setDetails] = useState<AdminOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const loadOrder = async (id: string, revealSensitive: boolean, clearPrevious: boolean) => {
    setLoading(true);
    setError(null);
    if (clearPrevious) {
      setDetails(null);
      setRevealed(false);
    }

    try {
      const { data: response } = await axios.get<AdminOrderDetails>(
        `${adminService}/api/admin/orders/${encodeURIComponent(id)}`,
        {
          params: { revealSensitive },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setDetails(response);
      setRevealed(revealSensitive);
    } catch (requestError: unknown) {
      console.error("Failed to load order details:", requestError);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const searchOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = orderId.trim();
    if (!id) {
      setError("Enter an order ID to search.");
      setDetails(null);
      return;
    }
    await loadOrder(id, false, true);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#E8E2D9] bg-white shadow-[0_20px_65px_-48px_rgba(48,42,36,0.5)]">
      <div className="border-b border-[#EEEAE4] bg-gradient-to-r from-[#FBF8F3] to-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#AF6028]">Order support</p>
            <h3 className="mt-1 text-2xl font-semibold text-[#302A24]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Order investigation
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#746C63]">
              Search an order ID to review its full timeline, customer, merchant, assigned rider and available documents.
            </p>
          </div>
          <form onSubmit={(event) => void searchOrder(event)} className="flex w-full gap-2 md:max-w-xl">
            <label htmlFor="admin-order-id" className="sr-only">Order ID</label>
            <input
              id="admin-order-id"
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Full order ID or last 6 characters"
              autoComplete="off"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#E2DDD5] bg-white px-4 font-mono text-sm text-[#302A24] outline-none transition placeholder:font-sans placeholder:text-[#A69D93] focus:border-[#AF6028] focus:ring-4 focus:ring-[#AF6028]/10"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#302A24] px-4 text-sm font-semibold text-white transition hover:bg-[#514337] disabled:cursor-wait disabled:opacity-60 sm:px-5"
            >
              <FiSearch aria-hidden="true" />
              {loading ? "Searching" : "Find order"}
            </button>
          </form>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#8B8177]">
          <FiShield className="mt-0.5 shrink-0 text-[#AF6028]" />
          Identity and payout numbers are masked until explicitly revealed. Access is limited to the configured administrator.
        </p>
      </div>

      <div className="p-5 sm:p-7">
        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {loading && !details ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-48 rounded bg-[#F0EEE9]" />
            <div className="h-24 rounded-2xl bg-[#F7F6F2]" />
          </div>
        ) : details ? (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B8177]">Order record</p>
                <h4 className="mt-1 break-all font-mono text-lg font-semibold text-[#302A24]">{details.order.id}</h4>
              </div>
              <button
                type="button"
                onClick={() => void loadOrder(details.order.id, !revealed, false)}
                disabled={loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#E2DDD5] px-3 text-sm font-semibold text-[#62594F] transition hover:border-[#AF6028] hover:text-[#AF6028] disabled:opacity-60 sm:self-auto"
              >
                {revealed ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                {revealed ? "Hide sensitive numbers" : "Reveal sensitive numbers"}
              </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <DetailsPanel title="Order & payment">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Status" value={details.order.status.replace(/_/g, " ")} />
                  <DetailField label="Payment status" value={details.order.paymentStatus} />
                  <DetailField label="Payment method" value={details.order.paymentMethod} />
                  <DetailField label="Placed" value={formatDetailDate(details.order.createdAt)} />
                  <DetailField label="Last updated" value={formatDetailDate(details.order.updatedAt)} />
                  <DetailField label="Order expires" value={formatDetailDate(details.order.expiresAt)} />
                  <DetailField label="Reached at" value={formatDetailDate(details.order.reachedAt)} />
                  <DetailField label="Picked up at" value={formatDetailDate(details.order.pickedUpAt)} />
                  <DetailField label="Delivered at" value={formatDetailDate(details.order.deliveredAt)} />
                  <DetailField label="Delivery distance" value={`${details.order.distance} km`} />
                  <DetailField label="Order user ID" value={details.order.userId} mono />
                  <DetailField label="Business ID" value={details.order.businessId} mono />
                  <DetailField label="Rider ID" value={details.order.riderId} mono />
                  <DetailField label="Rider user ID" value={details.order.riderUserId} mono />
                  <DetailField label="Rider assigned name" value={details.order.riderName} />
                  <DetailField label="Rider assigned phone" value={details.order.riderPhone} />
                </div>
                <div className="mt-4 space-y-2 border-t border-[#F0ECE6] pt-4">
                  {details.order.services.map((service, index) => (
                    <div key={`${service.serviceId}-${index}`} className="flex justify-between gap-4 text-sm">
                      <span className="text-[#62594F]">{service.name} × {service.quantity}</span>
                      <span className="font-medium text-[#403931]">{formatMoney(Number(service.price) * Number(service.quantity))}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 border-t border-[#F0ECE6] pt-4 sm:grid-cols-2">
                  <DetailField label="Subtotal" value={formatMoney(details.order.subtotal)} />
                  <DetailField label="Delivery fee" value={formatMoney(details.order.deliveryFee)} />
                  <DetailField label="Platform fee" value={formatMoney(details.order.platformFee)} />
                  <DetailField label="Rider amount" value={formatMoney(details.order.riderAmount)} />
                  <div className="sm:col-span-2">
                    <DetailField label="Order total" value={formatMoney(details.order.totalAmount)} />
                  </div>
                </div>
              </DetailsPanel>

              <DetailsPanel title="Customer & delivery">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Customer name" value={details.customer?.name || details.order.customerName} />
                  <DetailField label="Email" value={details.customer?.email} />
                  <DetailField label="Account role" value={details.customer?.role} />
                  <DetailField label="Account created" value={formatDetailDate(details.customer?.createdAt)} />
                  <DetailField label="Account updated" value={formatDetailDate(details.customer?.updatedAt)} />
                  <DetailField label="Delivery phone" value={details.order.deliveryAddress?.mobile} />
                  <DetailField label="Address ID" value={details.order.addressId} mono />
                  <div className="sm:col-span-2">
                    <DetailField label="Delivery address" value={details.order.deliveryAddress?.formattedAddress} />
                  </div>
                  <DetailField label="Delivery latitude" value={details.order.deliveryAddress?.latitude} />
                  <DetailField label="Delivery longitude" value={details.order.deliveryAddress?.longitude} />
                </div>
                {details.customer?.image && (
                  <DocumentLink label="Customer profile image" url={details.customer.image} />
                )}
              </DetailsPanel>

              <DetailsPanel title="Merchant & owner">
                {details.merchant ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailField label="Business name" value={details.merchant.name} />
                      <DetailField label="Business ID" value={details.merchant.id} mono />
                      <DetailField label="Owner user ID" value={details.merchant.ownerId} mono />
                      <DetailField label="Business phone" value={details.merchant.phone} />
                      <DetailField label="Address" value={details.merchant.address} />
                      <DetailField label="Open" value={details.merchant.isOpen ? "Yes" : "No"} />
                      <DetailField label="Verified" value={details.merchant.isVerified ? "Yes" : "No"} />
                      <DetailField label="Created" value={formatDetailDate(details.merchant.createdAt)} />
                      <DetailField label="Updated" value={formatDetailDate(details.merchant.updatedAt)} />
                      <div className="sm:col-span-2">
                        <DetailField label="Description" value={details.merchant.description} />
                      </div>
                    </div>
                    {details.merchant.location?.length === 2 && (
                      <DetailField label="Business coordinates" value={details.merchant.location.join(", ")} />
                    )}
                    <div className="mt-4 border-t border-[#F0ECE6] pt-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8B8177]">Owner account</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailField label="Name" value={details.merchant.owner?.name} />
                        <DetailField label="Email" value={details.merchant.owner?.email} />
                        <DetailField label="Role" value={details.merchant.owner?.role} />
                        <DetailField label="Account created" value={formatDetailDate(details.merchant.owner?.createdAt)} />
                        <DetailField label="Account updated" value={formatDetailDate(details.merchant.owner?.updatedAt)} />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <DocumentLink label="Business profile image" url={details.merchant.image} />
                      {details.merchant.owner?.image && (
                        <DocumentLink label="Owner profile image" url={details.merchant.owner.image} />
                      )}
                    </div>
                    <p className="mt-3 text-xs text-[#8B8177]">No additional merchant verification documents are stored in the available business profile.</p>
                  </>
                ) : (
                  <p className="text-sm text-[#8B8177]">Merchant profile is unavailable for this order.</p>
                )}
              </DetailsPanel>

              <DetailsPanel title="Assigned rider & documents">
                {details.rider ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailField label="Name" value={details.rider.user?.name || details.order.riderName} />
                      <DetailField label="Email" value={details.rider.user?.email} />
                      <DetailField label="Role" value={details.rider.user?.role} />
                      <DetailField label="Rider type" value={details.rider.riderType} />
                      <DetailField label="Phone" value={details.rider.phoneNumber} />
                      <DetailField label="Aadhaar" value={details.rider.aadhaarNumber} />
                      <DetailField label="Driving licence" value={details.rider.drivingLicenseNumber} />
                      <DetailField label="Account number" value={details.rider.accountNumber} />
                      <DetailField label="IFSC" value={details.rider.ifscCode} />
                      <DetailField label="UPI ID" value={details.rider.upiId} />
                      <DetailField label="Verified" value={details.rider.isVerified ? "Yes" : "No"} />
                      <DetailField label="Availability" value={details.rider.isBusy ? "Busy" : details.rider.isAvailable ? "Online" : "Offline"} />
                      <DetailField label="Last active" value={formatDetailDate(details.rider.lastActiveAt)} />
                      <DetailField label="Account created" value={formatDetailDate(details.rider.user?.createdAt)} />
                      <DetailField label="Rider profile created" value={formatDetailDate(details.rider.createdAt)} />
                      <DetailField label="Rider profile updated" value={formatDetailDate(details.rider.updatedAt)} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <DocumentLink label="Rider profile photo" url={details.rider.picture} />
                      <DocumentLink label="ID proof — front" url={details.rider.idProofFront} />
                      <DocumentLink label="ID proof — back" url={details.rider.idProofBack} />
                      <DocumentLink label="UPI QR code" url={details.rider.upiQrCode} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#8B8177]">No rider is assigned to this order, or the rider profile is unavailable.</p>
                )}
              </DetailsPanel>
            </div>
          </div>
        ) : !error ? (
          <div className="rounded-2xl border border-dashed border-[#E2DDD5] px-5 py-8 text-center">
            <FiFileText className="mx-auto text-2xl text-[#AF6028]" />
            <p className="mt-3 text-sm font-semibold text-[#403931]">Look up an order to inspect its details</p>
            <p className="mt-1 text-xs text-[#8B8177]">Use the order ID from the order record or customer support request.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const formatDetailDate = (value?: string | Date | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString("en-IN");
};

const DetailsPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#E9E4DC] bg-[#FEFDFC] p-4 sm:p-5">
    <h5 className="mb-4 text-base font-semibold text-[#302A24]">{title}</h5>
    {children}
  </section>
);

const DetailField = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) => {
  const text = value === undefined || value === null || value === "" ? "Not available" : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8B8177]">{label}</p>
      <p className={`mt-1 break-words text-sm text-[#403931] ${mono ? "font-mono text-xs" : ""}`}>{text}</p>
    </div>
  );
};

const DocumentLink = ({ label, url }: { label: string; url?: string | null }) => (
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E8E2D9] bg-white px-3 py-2 text-xs font-semibold text-[#62594F] transition hover:border-[#AF6028] hover:text-[#AF6028]"
    >
      <FiFileText aria-hidden="true" />
      {label}
      <FiExternalLink aria-hidden="true" />
    </a>
  ) : null
);

const AnalyticsDashboard = ({
  data,
  days,
  onRangeChange,
  loading,
}: {
  data: DashboardResponse;
  days: 7 | 30 | 90;
  onRangeChange: (days: 7 | 30 | 90) => void;
  loading: boolean;
}) => {
  const earningsChange = getPercentChange(
    data.performance.platformEarnings,
    data.performance.previousPlatformEarnings,
  );
  const salesChange = getPercentChange(
    data.performance.grossSales,
    data.performance.previousGrossSales,
  );
  const earningsImproved =
    data.performance.platformEarnings >= data.performance.previousPlatformEarnings;

  return (
    <section className={`space-y-5 transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#302A24] via-[#42352B] to-[#76451F] p-6 text-white shadow-[0_24px_70px_-38px_rgba(48,42,36,0.65)] sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/[0.04]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-28 h-72 w-72 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E6B98E]">Platform earnings</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatMoney(data.performance.platformEarnings)}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/65">
              <span className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-semibold ${earningsImproved ? "text-[#D8F4D6]" : "text-[#F3C1AE]"}`}>
                {earningsImproved ? <FiTrendingUp aria-hidden="true" /> : <FiTrendingDown aria-hidden="true" />}
                {earningsChange}% vs previous {days} days
              </span>
              <span>Lifetime earnings {formatMoney(data.summary.platformEarnings)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onRangeChange(range as 7 | 30 | 90)}
                aria-pressed={days === range}
                className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${
                  days === range
                    ? "bg-white text-[#302A24] shadow-lg"
                    : "border border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
                }`}
              >
                {range} days
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Gross sales" value={formatMoney(data.performance.grossSales)} detail={`${salesChange}% vs previous period`} icon={<FiDollarSign />} accent="orange" />
        <MetricCard label="Orders placed" value={data.performance.orders.toLocaleString("en-IN")} detail={`${data.performance.paidOrders} paid orders`} icon={<FiShoppingBag />} accent="blue" />
        <MetricCard label="New customers" value={data.summary.newUsers.toLocaleString("en-IN")} detail={`${data.summary.customers.toLocaleString("en-IN")} customers total`} icon={<FiUsers />} accent="green" />
        <MetricCard label="Payments pending" value={data.performance.pendingPayments.toLocaleString("en-IN")} detail={`${data.performance.canceledOrders} canceled in period`} icon={<FiActivity />} accent="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <ChartPanel title="Earnings trend" subtitle={`Daily platform fees · last ${days} days`} data={data.trends} valueKey="earnings" color="#AF6028" formatValue={formatMoney} />
        <ChartPanel title="Order activity" subtitle="Orders created each day" data={data.trends} valueKey="orders" color="#537B69" formatValue={(value) => value.toLocaleString("en-IN")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        <section className="rounded-3xl border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[#302A24]">Top businesses</h3>
              <p className="mt-1 text-sm text-[#8B8177]">Ranked by paid sales</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F1EA] text-[#AF6028]"><FiBarChart2 /></span>
          </div>
          {data.topBusinesses.length === 0 ? (
            <EmptyAnalytics message="Paid orders will appear here once they come in." />
          ) : (
            <div className="mt-5 space-y-5">
              {data.topBusinesses.map((business, index) => {
                const maxRevenue = Math.max(...data.topBusinesses.map((item) => item.revenue), 1);
                return (
                  <motion.div
                    key={`${business.name}-${index}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F6F3EF] text-xs font-bold text-[#8B8177]">{index + 1}</span>
                        <span className="truncate font-semibold text-[#403931]">{business.name || "Business"}</span>
                      </div>
                      <span className="shrink-0 font-semibold text-[#302A24]">{formatMoney(business.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F1EEE9]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(business.revenue / maxRevenue) * 100}%` }}
                        transition={{ duration: 0.8, delay: index * 0.06 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#AF6028] to-[#D99A64]"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[#9A9188]">{business.orders} paid {business.orders === 1 ? "order" : "orders"}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#E8E2D9] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#EEEAE4] p-5 sm:px-6">
            <div>
              <h3 className="font-semibold text-[#302A24]">Recent orders</h3>
              <p className="mt-1 text-sm text-[#8B8177]">Latest activity across the platform</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4F0] text-[#537B69]"><FiPackage /></span>
          </div>
          {data.recentOrders.length === 0 ? (
            <div className="px-5 pb-3"><EmptyAnalytics message="Orders will show here when customers check out." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-[#FBFAF8] text-xs uppercase tracking-wide text-[#9A9188]">
                  <tr>
                    <th className="px-5 py-3 font-semibold sm:px-6">Order</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-6">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEE9]">
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-[#FCFBF9]">
                      <td className="px-5 py-3.5 sm:px-6">
                        <p className="font-semibold text-[#403931]">{order.businessName || "Order"}</p>
                        <p className="mt-0.5 text-xs text-[#9A9188]">{order.customerName || "Customer"} · {formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-[#F4F2EE] px-2.5 py-1 text-xs font-medium capitalize text-[#62594F]">
                          {(order.status || "unknown").replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          order.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {order.paymentStatus || "unknown"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#302A24] sm:px-6">{formatMoney(order.totalAmount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <NetworkCard label="Registered users" value={data.summary.users} detail={`${data.summary.newUsers} new in selected period`} icon={<FiUsers />} />
        <NetworkCard label="Businesses" value={data.summary.businesses} detail="Across the marketplace" icon={<FiShoppingBag />} />
        <NetworkCard label="Riders" value={data.summary.riders} detail={`${data.summary.paidOrders} all-time paid orders`} icon={<FiActivity />} />
      </div>
    </section>
  );
};

const getPercentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? "0" : "100";
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${Math.round(change)}`;
};

const MetricCard = ({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent: "orange" | "blue" | "green" | "amber";
}) => {
  const colors = {
    orange: "bg-orange-50 text-[#AF6028]",
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#746C63]">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[accent]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#302A24] sm:text-3xl">{value}</p>
      <p className="mt-1.5 text-xs text-[#9A9188]">{detail}</p>
    </motion.article>
  );
};

const ChartPanel = ({
  title,
  subtitle,
  data,
  valueKey,
  color,
  formatValue,
}: {
  title: string;
  subtitle: string;
  data: DashboardResponse["trends"];
  valueKey: "earnings" | "orders";
  color: string;
  formatValue: (value: number) => string;
}) => {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 30, left: 12 };
  const values = data.map((item) => item[valueKey]);
  const maxValue = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: padding.left + (index / Math.max(values.length - 1, 1)) * (width - padding.left - padding.right),
    y: padding.top + (1 - value / maxValue) * (height - padding.top - padding.bottom),
    value,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : "";
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <section className="rounded-3xl border border-[#E8E2D9] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#302A24]">{title}</h3>
          <p className="mt-1 text-sm text-[#8B8177]">{subtitle}</p>
        </div>
        <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="mt-5 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} chart`} className="h-52 w-full overflow-visible">
          {[0, 1, 2, 3].map((line) => {
            const y = padding.top + (line / 3) * (height - padding.top - padding.bottom);
            return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#F0ECE6" strokeDasharray="4 6" />;
          })}
          <path d={areaPath} fill={color} fillOpacity="0.09" />
          <motion.path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          {points.map((point, index) => (
            <g key={data[index].date}>
              <circle cx={point.x} cy={point.y} r="9" fill={color} fillOpacity="0.12" />
              <circle cx={point.x} cy={point.y} r="3.5" fill={color}>
                <title>{`${formatDate(data[index].date)}: ${formatValue(point.value)}`}</title>
              </circle>
            </g>
          ))}
          {data.map((item, index) => index % labelStep === 0 || index === data.length - 1 ? (
            <text
              key={item.date}
              x={points[index].x}
              y={height - 5}
              textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
              fill="#9A9188"
              fontSize="11"
            >
              {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${item.date}T00:00:00Z`))}
            </text>
          ) : null)}
        </svg>
        <div className="mt-1 flex items-center justify-between border-t border-[#F1EEE9] pt-3 text-xs text-[#9A9188]">
          <span>{formatValue(Math.min(...values, 0))}</span>
          <span>Peak {formatValue(Math.max(...values, 0))}</span>
        </div>
      </div>
    </section>
  );
};

const NetworkCard = ({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) => (
  <div className="flex items-center gap-4 rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-sm sm:p-5">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8F1EA] text-lg text-[#AF6028]">{icon}</span>
    <div className="min-w-0">
      <p className="text-sm text-[#746C63]">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-[#302A24]">{value.toLocaleString("en-IN")}</p>
      <p className="truncate text-xs text-[#9A9188]">{detail}</p>
    </div>
  </div>
);

const EmptyAnalytics = ({ message }: { message: string }) => (
  <div className="mt-5 rounded-2xl border border-dashed border-[#E5DED5] bg-[#FBFAF8] px-4 py-6 text-center text-sm text-[#8B8177]">
    {message}
  </div>
);

const StatCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "amber" | "green" | "orange" | "blue";
}) => {
  const colors = {
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#746C63]">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[accent]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#302A24]">{value}</p>
    </div>
  );
};

const TabButton = ({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active ? "bg-white text-[#302A24] shadow-sm" : "text-[#746C63] hover:text-[#302A24]"
    }`}
  >
    {label}
    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? "bg-[#F5EEE8] text-[#AF6028]" : "bg-white/70 text-[#8B8177]"}`}>
      {count}
    </span>
  </button>
);

const ReviewSection = ({
  title,
  description,
  count,
  emptyText,
  children,
}: {
  title: string;
  description: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) => (
  <section>
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-[#302A24]">{title}</h3>
        <p className="mt-0.5 text-sm text-[#8B8177]">{description}</p>
      </div>
      <span className="text-sm font-medium text-[#8B8177]">{count} {count === 1 ? "profile" : "profiles"}</span>
    </div>
    {count === 0 ? (
      <div className="rounded-2xl border border-dashed border-[#DED7CE] bg-[#FBFAF8] px-5 py-8 text-center text-sm text-[#8B8177]">
        <FiCheckCircle className="mx-auto mb-2 text-xl text-emerald-600" />
        {emptyText}
      </div>
    ) : (
      <div className="grid gap-3 xl:grid-cols-2">{children}</div>
    )}
  </section>
);

const StatusBadge = ({ verified }: { verified: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
    verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
  }`}>
    {verified ? <FiCheckCircle /> : <FiClock />}
    {verified ? "Verified" : "Pending review"}
  </span>
);

const VerificationButton = ({
  verified,
  loading,
  onClick,
}: {
  verified: boolean;
  loading: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60 ${
      verified ? "bg-[#5F5A54] hover:bg-[#48443F]" : "bg-[#AF6028] hover:bg-[#98501F]"
    }`}
  >
    {verified ? <FiRefreshCw /> : <FiCheck />}
    {loading ? "Saving..." : verified ? "Revoke" : "Verify"}
  </button>
);

export default AdminDashboard;
