import { useCallback, useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import {
  FiActivity,
  FiArrowRight,
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCompass,
  FiDollarSign,
  FiFileText,
  FiHeadphones,
  FiLock,
  FiMapPin,
  FiNavigation,
  FiPackage,
  FiPhone,
  FiShield,
  FiTruck,
  FiUploadCloud,
  FiUser,
  FiVolume2,
} from "react-icons/fi";
import { motion, useReducedMotion } from "framer-motion";
import type { IOrder } from "../types";
import audio from "../assets/mangaletp-funny-laughing-406018.mp3";
import logo from "../assets/logo.png";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderOrderMap from "../components/RiderOrderMap";

export interface IRider {

  _id : string;
  riderType : "bike" | "bicycle" | "walking";
  phoneNumber : string;
  addharNumber : string;
  drivingLicenseNumber?: string;
  idProofFront: string;
  idProofBack: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  upiQrCode?: string;
  isVerified : boolean;
  isAvailble : boolean;
  isBusy?: boolean;
  picture : string;

}

const RiderDashboard = () => {

  const {user} = useAppData();
  const {socket} = useSocket();
  const shouldReduceMotion = useReducedMotion();

  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [locationTrackingError, setLocationTrackingError] = useState<string | null>(null);

  const [incomingOrders, setIncomingOrders] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const incomingOrderIds = useRef(new Set<string>());

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(()=>{
    audioRef.current = new Audio(audio);
    audioRef.current.preload = "auto";
    audioRef.current.load();
  }, []);

  const unlockAudio = async() => {
    try {
      if(!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
      toast.success("Sound enabled..");
    } catch (error) {
      console.error("Failed to enable order notification audio:", error);
      toast.error("Tap again to enable sound");
    }
}

useEffect(()=>{
  if(!socket) return;
  const onOrderAvailable = ({orderId}:{orderId:string}) => {
    if (incomingOrderIds.current.has(orderId)) return;
    incomingOrderIds.current.add(orderId);
    setIncomingOrders((prev)=>prev.includes(orderId)? prev:[...prev, orderId])
    if(audioUnlocked && audioRef.current){
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error("Failed to play incoming order notification:", error);
      });
    }
    setTimeout(() => {
      incomingOrderIds.current.delete(orderId);
      setIncomingOrders((prev)=>prev.filter((id) => id!==orderId));
    }, 10000);
  }
  const onOrderClaimed = ({orderId}: {orderId: string}) => {
    incomingOrderIds.current.delete(orderId);
    setIncomingOrders((orders) => orders.filter((id) => id !== orderId));
  };
  socket.on("order:available", onOrderAvailable);
  socket.on("order:claimed", onOrderClaimed);
  return ()=>{
    socket.off("order:available", onOrderAvailable);
    socket.off("order:claimed", onOrderClaimed);
  }
}, [socket, audioUnlocked])

  const fetchProfile = useCallback(async (showLoading = true) => {
  try {
    if (showLoading) setLoading(true);

    const { data } = await axios.get<{ rider: IRider | null }>(
      `${riderService}/api/rider/myprofile`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    setProfile(data.rider ?? null);
  } catch (error) {
    setProfile(null);
    console.error("Failed to fetch rider profile:", error);
    setProfile(null);
  } finally {
    if (showLoading) setLoading(false);
  }
}, []);


useEffect(()=>{
  if(user?.role === "rider"){
    void Promise.resolve().then(() => fetchProfile());
  }
}, [user?.role, fetchProfile]);


const fetchCurrentOrder = useCallback(async() => {
  try {
    const {data} = await axios.get(`${riderService}/api/rider/order/current`, {
      headers:{
        Authorization :  `Bearer ${localStorage.getItem("token")}`
      }
    })
    setCurrentOrder(data.order);
  } catch (error) {
    console.log(error);
  }
}, []);

useEffect(()=>{
  if (user?.role === "rider") void Promise.resolve().then(fetchCurrentOrder);
}, [user?.role, fetchCurrentOrder]);

useEffect(() => {
  if (!profile?.isAvailble || profile.isBusy || currentOrder) {
    setLocationTrackingError(null);
    return;
  }
  if (!navigator.geolocation) {
    queueMicrotask(() => {
      setLocationTrackingError("Location access is not supported by this browser.");
    });
    return;
  }

  let isTracking = true;
  const watchId = navigator.geolocation.watchPosition(
    ({ coords }) => {
      if (!isTracking) return;
      if (
        !Number.isFinite(coords.latitude) ||
        coords.latitude < -90 ||
        coords.latitude > 90 ||
        !Number.isFinite(coords.longitude) ||
        coords.longitude < -180 ||
        coords.longitude > 180
      ) {
        setLocationTrackingError("Your browser returned an invalid location.");
        return;
      }

      void axios.patch(
        `${riderService}/api/rider/location`,
        { latitude: coords.latitude, longitude: coords.longitude },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      ).then(() => {
        if (isTracking) setLocationTrackingError(null);
      }).catch((error: unknown) => {
        if (!isTracking) return;
        if (axios.isAxiosError(error) && error.response?.status === 409) return;
        console.error("Failed to update online rider location:", error);
        setLocationTrackingError("Could not sync location for nearby requests. Live order tracking is unaffected.");
      });
    },
    (error) => {
      if (!isTracking) return;
      console.error("Could not track online rider location:", error);
      setLocationTrackingError("Location access is required to receive nearby delivery requests.");
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
  );
  return () => {
    isTracking = false;
    navigator.geolocation.clearWatch(watchId);
  };
}, [currentOrder, profile?.isAvailble, profile?.isBusy]);

useEffect(() => {
  if (!socket) return;

  const onOrderAssigned = (order: IOrder) => {
    setCurrentOrder(order);
    setIncomingOrders([]);
    incomingOrderIds.current.clear();
    void fetchProfile(false);
    void fetchCurrentOrder();
  };
  const onOrderUpdated = () => {
    void fetchCurrentOrder();
    void fetchProfile(false);
  };
  const onSocketConnected = () => {
    void fetchCurrentOrder();
  };

  socket.on("order:rider_assigned", onOrderAssigned);
  socket.on("order_update", onOrderUpdated);
  socket.on("connect", onSocketConnected);
  if (socket.connected) void Promise.resolve().then(fetchCurrentOrder);

  return () => {
    socket.off("order:rider_assigned", onOrderAssigned);
    socket.off("order_update", onOrderUpdated);
    socket.off("connect", onSocketConnected);
  };
}, [socket, fetchCurrentOrder, fetchProfile]);

const updateCurrentOrder = async () => {
  if (!currentOrder) return;
  setUpdatingOrder(true);
  try {
    const { data } = await axios.put(
      `${riderService}/api/rider/order/update/${currentOrder._id}`,
      { expectedStatus: currentOrder.status },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    toast.success(data.message);
    await Promise.all([fetchCurrentOrder(), fetchProfile(false)]);
  } catch (error: unknown) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message
      : undefined;
    toast.error(typeof message === "string" ? message : "Could not update order status");
  } finally {
    setUpdatingOrder(false);
  }
};

const removeIncomingOrder = (orderId: string) => {
  setIncomingOrders((orders) => orders.filter((id) => id !== orderId));
};

const resolveIncomingOrder = (orderId: string) => {
  removeIncomingOrder(orderId);
  void fetchProfile(false);
  void fetchCurrentOrder();
};


const toggleAvailibility = async() => {

  if(!navigator.geolocation){
    toast.error("Location access required");
    return;
  }

  setToggling(true);

  navigator.geolocation.getCurrentPosition(async(pos) =>{
    try {
      await axios.patch(`${riderService}/api/rider/toggle`, {isAvailble : !profile?.isAvailble, latitude : pos.coords.latitude, longitude : pos.coords.longitude}, {
        headers : {
          Authorization :  `Bearer ${localStorage.getItem("token")}`,
        }
      })
      setLocationTrackingError(null);
      toast.success(profile?.isAvailble ? "You are offline now" : "You are Online now");
      fetchProfile();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(typeof message === "string" ? message : "Could not update availability");
    }finally{
      setToggling(false);
    }
  }, () => {
    toast.error("Location access is required to update availability");
    setToggling(false);
  });

}


const [phoneNumber, setPhoneNumber] = useState("");
const [addharNumber, setAddharNumber] = useState("");
const [riderType, setRiderType] = useState<"bike" | "bicycle" | "walking">("bike");
const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
const [image, setImage] = useState<File | null>(null);
const [idProofFront, setIdProofFront] = useState<File | null>(null);
const [idProofBack, setIdProofBack] = useState<File | null>(null);
const [accountNumber, setAccountNumber] = useState("");
const [ifscCode, setIfscCode] = useState("");
const [upiId, setUpiId] = useState("");
const [upiQrCode, setUpiQrCode] = useState<File | null>(null);
const [submitting, setSubmitting] = useState(false);


const handleSubmit = async() => {

  if(!navigator.geolocation){
    toast.error("Location access required");
    return;
  }

  if (!image) {
    toast.error("Please select a rider photo");
    return;
  }

  if (riderType === "bike" && !drivingLicenseNumber.trim()) {
    toast.error("Driving license number is required for bike riders");
    return;
  }

  if (!idProofFront || !idProofBack) {
    toast.error("Please upload both front and back photos of your ID proof");
    return;
  }

  if (!accountNumber.trim() || !ifscCode.trim()) {
    toast.error("Please enter your bank account number and IFSC code");
    return;
  }

  if (!upiId.trim() && !upiQrCode) {
    toast.error("Please provide a UPI ID or upload your UPI QR code");
    return;
  }

  const registrationImages = [image, idProofFront, idProofBack, upiQrCode].filter(
    (file): file is File => file !== null,
  );
  if (registrationImages.some((file) => file.size > 5 * 1024 * 1024)) {
    toast.error("Each uploaded image must be 5 MB or smaller");
    return;
  }

  setSubmitting(true)
  navigator.geolocation.getCurrentPosition(async(pos) =>{

    const formData = new FormData();

    formData.append("phoneNumber", phoneNumber);
    formData.append("addharNumber", addharNumber);
    formData.append("riderType", riderType);
    if (riderType === "bike") formData.append("drivingLicenseNumber", drivingLicenseNumber.trim());
    formData.append("accountNumber", accountNumber.trim());
    formData.append("ifscCode", ifscCode.trim().toUpperCase());
    if (upiId.trim()) formData.append("upiId", upiId.trim());
    formData.append("latitude", pos.coords.latitude.toString());
    formData.append("longitude", pos.coords.longitude.toString());
    formData.append("file", image);
    formData.append("idProofFront", idProofFront);
    formData.append("idProofBack", idProofBack);
    if (upiQrCode) formData.append("upiQrCode", upiQrCode);

    try {
      const {data} = await axios.post(`${riderService}/api/rider/new`, formData, {
        headers : {
          Authorization :  `Bearer ${localStorage.getItem("token")}`,
        }
      });
      toast.success(data.message);
      fetchProfile();
    } catch (error : unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(typeof message === "string" ? message : "Could not create rider profile");
    }finally{
      setSubmitting(false);
    }
  }, () => {
    toast.error("Location access is required to register as a rider");
    setSubmitting(false);
  });

};



if(user?.role !== "rider"){
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#F5F5F1] px-5 text-[#24342F]">
      <div className="rounded-3xl border border-[#E5E9E4] bg-white px-8 py-10 text-center shadow-sm">
        <FiShield className="mx-auto text-3xl text-[#557A69]" />
        <p className="mt-4 font-semibold">Rider access only</p>
        <p className="mt-1 text-sm text-[#7D8983]">This workspace is available to registered rider partners.</p>
      </div>
    </main>
  );
}


if(loading){
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#F5F5F1]">
      <div className="flex items-center gap-3 rounded-2xl border border-[#E5E9E4] bg-white px-5 py-4 text-sm font-medium text-[#52655C] shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#DDE6DF] border-t-[#557A69]" />
        Preparing your rider workspace...
      </div>
    </main>
  );
}


if (!profile) {
  return (
    <motion.main
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[calc(100vh-5rem)] bg-[#F4F6F2] px-4 py-8 text-[#26352F] sm:px-7 sm:py-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SanX logo" className="h-11 w-11 object-contain" />
            <div>
              <p
                className="text-xl font-semibold leading-5 text-[#557A69]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                SanX
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[#839087]">
                RIDER PARTNER
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DFE9E1] bg-white/80 px-3 py-2 text-xs font-medium text-[#718078]">
            <FiLock className="text-[#557A69]" />
            Secure registration
          </span>
        </div>

        <div className="grid overflow-hidden rounded-[1.75rem] border border-[#E3E9E2] bg-white shadow-[0_24px_70px_-44px_rgba(38,53,47,0.35)] lg:grid-cols-[0.82fr_1.18fr]">
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden bg-gradient-to-br from-[#20342B] via-[#2E493B] to-[#426953] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-11 lg:py-12"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-8 h-48 w-48 rounded-full border border-white/10"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-[#C8E4CF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#91C69A]" />
                PARTNER ONBOARDING
              </span>
              <h1
                className="mt-7 max-w-sm text-4xl leading-[1.12] font-medium sm:text-5xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Make every delivery count.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
                Join the SanX rider network and bring great local experiences closer to everyone.
              </p>

              <div className="mt-9 space-y-4">
                <div className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8CC49A]/15 text-[#BFE0C5]">
                    <FiTruck size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">A smoother way to ride</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">Manage your rider profile in one place.</p>
                  </div>
                </div>
                <div className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8CC49A]/15 text-[#BFE0C5]">
                    <FiCheckCircle size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Verified and ready</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">Submit your details for profile verification.</p>
                  </div>
                </div>
              </div>

              <div className="mt-9 flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/50">
                <FiLock className="shrink-0 text-[#91C69A]" />
                <span>Your information is used to set up your rider account securely.</span>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="px-5 py-7 sm:px-9 sm:py-10 lg:px-12 lg:py-12"
          >
            <div className="mx-auto max-w-xl">
              <div className="mb-8">
                <p className="text-xs font-bold tracking-[0.15em] text-[#557A69]">YOUR PROFILE</p>
                <h2
                  className="mt-2 text-3xl font-medium text-[#302A24] sm:text-4xl"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Let’s get you started.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#746C63]">
                  Add your details below to complete your rider registration.
                </p>
              </div>

              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmit();
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phoneNumber" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiPhone className="text-[#557A69]" />
                      Phone number
                    </label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      required
                      className="min-h-12 w-full rounded-xl border border-[#DFE6DF] bg-[#F8FAF7] px-4 text-sm text-[#26352F] outline-none transition focus:border-[#648B6D] focus:bg-white focus:ring-4 focus:ring-[#648B6D]/10"
                      placeholder="+91 00000 00000"
                    />
                  </div>

                  <div>
                    <label htmlFor="addharNumber" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiFileText className="text-[#557A69]" />
                      Aadhaar number
                    </label>
                    <input
                      id="addharNumber"
                      type="text"
                      value={addharNumber}
                      onChange={(event) => setAddharNumber(event.target.value)}
                      required
                      className="min-h-12 w-full rounded-xl border border-[#DFE6DF] bg-[#F8FAF7] px-4 text-sm text-[#26352F] outline-none transition focus:border-[#648B6D] focus:bg-white focus:ring-4 focus:ring-[#648B6D]/10"
                      placeholder="Enter Aadhaar number"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="riderType" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                    <FiTruck className="text-[#557A69]" />
                    Delivery mode
                  </label>
                  <select
                    id="riderType"
                    value={riderType}
                    onChange={(event) => setRiderType(event.target.value as "bike" | "bicycle" | "walking")}
                    required
                    className="min-h-12 w-full rounded-xl border border-[#DFE6DF] bg-[#F8FAF7] px-4 text-sm text-[#26352F] outline-none transition focus:border-[#648B6D] focus:bg-white focus:ring-4 focus:ring-[#648B6D]/10"
                  >
                    <option value="bike">Bike</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="walking">Walking</option>
                  </select>
                </div>

                {riderType === "bike" && (
                  <div>
                    <label htmlFor="drivingLicenseNumber" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiFileText className="text-[#557A69]" />
                      Driving license number
                    </label>
                    <input
                      id="drivingLicenseNumber"
                      type="text"
                      value={drivingLicenseNumber}
                      onChange={(event) => setDrivingLicenseNumber(event.target.value)}
                      required
                      className="min-h-12 w-full rounded-xl border border-[#DFE6DF] bg-[#F8FAF7] px-4 text-sm text-[#26352F] outline-none transition focus:border-[#648B6D] focus:bg-white focus:ring-4 focus:ring-[#648B6D]/10"
                      placeholder="Enter driving license number"
                    />
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="idProofFront" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiFileText className="text-[#557A69]" />
                      ID proof · front photo
                    </label>
                    <input
                      id="idProofFront"
                      type="file"
                      accept="image/*"
                      required
                      onChange={(event) => setIdProofFront(event.target.files?.[0] ?? null)}
                      className="w-full text-sm text-[#52655C] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E5F0E7] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#456653]"
                    />
                  </div>
                  <div>
                    <label htmlFor="idProofBack" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiFileText className="text-[#557A69]" />
                      ID proof · back photo
                    </label>
                    <input
                      id="idProofBack"
                      type="file"
                      accept="image/*"
                      required
                      onChange={(event) => setIdProofBack(event.target.files?.[0] ?? null)}
                      className="w-full text-sm text-[#52655C] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E5F0E7] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#456653]"
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="accountNumber" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiDollarSign className="text-[#557A69]" />
                      Bank account number
                    </label>
                    <input
                      id="accountNumber"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={accountNumber}
                      onChange={(event) => setAccountNumber(event.target.value)}
                      required
                      className="min-h-12 w-full rounded-xl border border-[#DFE6DF] bg-[#F8FAF7] px-4 text-sm text-[#26352F] outline-none transition focus:border-[#648B6D] focus:bg-white focus:ring-4 focus:ring-[#648B6D]/10"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label htmlFor="ifscCode" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiFileText className="text-[#557A69]" />
                      IFSC code
                    </label>
                    <input
                      id="ifscCode"
                      type="text"
                      autoComplete="off"
                      value={ifscCode}
                      onChange={(event) => setIfscCode(event.target.value)}
                      required
                      className="min-h-12 w-full rounded-xl border border-[#DFE6DF] bg-[#F8FAF7] px-4 text-sm uppercase text-[#26352F] outline-none transition focus:border-[#648B6D] focus:bg-white focus:ring-4 focus:ring-[#648B6D]/10"
                      placeholder="e.g. HDFC0001234"
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="upiId" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiDollarSign className="text-[#557A69]" />
                      UPI ID
                    </label>
                    <input
                      id="upiId"
                      type="text"
                      autoComplete="off"
                      value={upiId}
                      onChange={(event) => setUpiId(event.target.value)}
                      required={!upiQrCode}
                      className="min-h-12 w-full rounded-xl border border-[#DFE6DF] bg-[#F8FAF7] px-4 text-sm text-[#26352F] outline-none transition focus:border-[#648B6D] focus:bg-white focus:ring-4 focus:ring-[#648B6D]/10"
                      placeholder="name@bank"
                    />
                  </div>
                  <div>
                    <label htmlFor="upiQrCode" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                      <FiFileText className="text-[#557A69]" />
                      UPI QR code
                    </label>
                    <input
                      id="upiQrCode"
                      type="file"
                      accept="image/*"
                      required={!upiId.trim()}
                      onChange={(event) => setUpiQrCode(event.target.files?.[0] ?? null)}
                      className="w-full text-sm text-[#52655C] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E5F0E7] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#456653]"
                    />
                    <p className="mt-1 text-xs text-[#8B8177]">Provide UPI ID, QR code, or both.</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="riderPicture" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#35443B]">
                    <FiUser className="text-[#557A69]" />
                    Profile photo <span className="font-normal text-[#9A9188]">(required, max 5 MB)</span>
                  </label>
                  <label
                    htmlFor="riderPicture"
                    className="group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBDCCF] bg-[#F7FAF7] px-5 py-5 text-center transition hover:border-[#648B6D] hover:bg-[#EFF6F0]"
                  >
                    <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F0E7] text-[#557A69] transition group-hover:scale-105">
                      <FiUploadCloud size={20} />
                    </span>
                    <span className="text-sm font-semibold text-[#35443B]">
                      {image ? image.name : "Choose a photo to upload"}
                    </span>
                    <span className="mt-1 text-xs text-[#8B8177]">JPG or PNG · A clear face photo works best</span>
                    <input
                      id="riderPicture"
                      type="file"
                      accept="image/*"
                      required
                      onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#557A69] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(63,105,78,0.65)] transition hover:-translate-y-0.5 hover:bg-[#456653] hover:shadow-[0_14px_26px_-12px_rgba(63,105,78,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#648B6D]/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting your details..." : "Complete rider registration"}
                  {!submitting && <FiArrowRight className="transition-transform group-hover:translate-x-1" />}
                </button>
                <p className="text-center text-xs leading-5 text-[#8B8177]">
                  By submitting, you confirm that the information provided is accurate.
                </p>
              </form>
            </div>
          </motion.section>
        </div>
      </div>
    </motion.main>
  );
}



  return (
    <motion.main
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#F4F6F2] pb-12 text-[#26352F]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-7">
        <header className="flex items-center justify-between border-b border-[#E6EAE4] py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SanX logo" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-lg font-bold leading-5 tracking-tight text-[#3E6A55]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>SanX</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#839087]">Rider workspace</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-[#E1E9E2] bg-white px-3 py-2 text-xs font-medium text-[#718078] sm:flex">
            <FiShield className="text-[#557A69]" />
            Partner account
          </span>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold sm:hidden ${profile.isBusy || currentOrder ? "bg-amber-50 text-amber-700" : profile.isAvailble ? "bg-emerald-50 text-emerald-700" : "bg-[#ECEFEC] text-[#6D7972]"}`}>
            <span className={`h-2 w-2 rounded-full ${profile.isBusy || currentOrder ? "bg-amber-500" : profile.isAvailble ? "animate-pulse bg-emerald-500" : "bg-[#9AA49E]"}`} />
            {profile.isBusy || currentOrder ? "On delivery" : profile.isAvailble ? "Online" : "Offline"}
          </span>
        </header>

        <section className="flex flex-col justify-between gap-4 py-7 sm:flex-row sm:items-end sm:py-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64816F]">Your delivery day</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#25342D] sm:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Good to see you, {user?.name?.split(" ")[0] || "Rider"}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#78847D]">
              Your rider hub is ready. Manage availability, stay on top of active deliveries, and keep your route moving.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-[#E4E9E3] bg-white px-3.5 py-2.5 text-xs font-medium text-[#758179] sm:self-auto">
            <FiActivity className="text-[#64816F]" />
            Live rider status
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <motion.article
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#20342B] via-[#2E493B] to-[#426953] p-5 text-white shadow-[0_24px_70px_-42px_rgba(32,52,43,0.8)] sm:p-7"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full border border-white/10 bg-white/[0.03]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-36 h-56 w-56 rounded-full border border-white/[0.08]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-1.5 shadow-lg">
                  <img src={profile.picture} alt={`${user?.name || "Rider"} profile`} className="h-[4.5rem] w-[4.5rem] rounded-xl object-cover" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{user?.name || "Rider partner"}</p>
                  <p className="mt-1 text-sm text-white/60">{profile.phoneNumber}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${profile.isVerified ? "bg-emerald-300/15 text-emerald-100" : "bg-amber-200/15 text-amber-100"}`}>
                      {profile.isVerified ? <FiCheckCircle /> : <FiClock />}
                      {profile.isVerified ? "Verified partner" : "Verification pending"}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${profile.isBusy || currentOrder ? "bg-amber-200/15 text-amber-100" : profile.isAvailble ? "bg-emerald-300/15 text-emerald-100" : "bg-white/10 text-white/70"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${profile.isBusy || currentOrder ? "bg-amber-300" : profile.isAvailble ? "animate-pulse bg-emerald-300" : "bg-white/45"}`} />
                      {profile.isBusy || currentOrder ? "Busy on delivery" : profile.isAvailble ? "Available for orders" : "Currently offline"}
                    </span>
                  </div>
                </div>
              </div>
              {profile.isVerified && (
                <button
                  type="button"
                  onClick={toggleAvailibility}
                  disabled={toggling}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${
                    profile.isAvailble
                      ? "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                      : "bg-[#C4E4C6] text-[#20372A] shadow-lg shadow-black/10 hover:bg-[#D5EBD6]"
                  }`}
                >
                  {toggling ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <FiActivity />}
                  {toggling ? "Updating..." : profile.isAvailble ? "Go offline" : "Go online"}
                </button>
              )}
            </div>
            {locationTrackingError && (
              <p role="alert" className="relative mt-4 rounded-xl border border-red-100 bg-red-50/10 px-4 py-3 text-sm text-red-100">
                {locationTrackingError}
              </p>
            )}
            {!profile.isVerified && (
              <div className="relative mt-6 flex items-start gap-3 rounded-2xl border border-amber-100/15 bg-amber-100/[0.08] p-4 text-sm text-amber-50/90">
                <FiLock className="mt-0.5 shrink-0 text-amber-200" />
                <p>Your profile is being reviewed. Going online and receiving delivery requests will be enabled once verification is complete.</p>
              </div>
            )}
          </motion.article>

          <article className="flex flex-col justify-between rounded-[1.75rem] border border-[#E3E9E2] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A968E]">Rider readiness</p>
                <h2 className="mt-2 text-xl font-semibold text-[#2D3C34]">{profile.isBusy || currentOrder ? "Delivery in progress" : profile.isAvailble ? "You’re on the map" : "Ready when you are"}</h2>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF4EE] text-xl text-[#557A69]"><FiCompass /></span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-[#F7F9F6] px-3.5 py-3">
                <FiMapPin className="shrink-0 text-[#64816F]" />
                <p className="text-xs leading-5 text-[#748178]">Stay within 500 m of a restaurant hotspot to receive nearby delivery requests.</p>
              </div>
              {currentOrder ? (
                <div className="flex items-center gap-3 rounded-xl bg-[#F7F9F6] px-3.5 py-3">
                  <FiPackage className="shrink-0 text-[#64816F]" />
                  <p className="text-xs text-[#748178]">Delivery in progress · <span className="font-semibold text-[#415B4C]">#{currentOrder._id.slice(-6)}</span></p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-[#F7F9F6] px-3.5 py-3">
                  <FiCheck className="shrink-0 text-[#64816F]" />
                  <p className="text-xs text-[#748178]">{profile.isBusy || currentOrder ? "New requests are paused until this delivery is complete." : profile.isAvailble ? "You can receive new delivery requests." : "Go online when you’re ready to accept deliveries."}</p>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <RiderSummaryCard icon={<FiActivity />} label="Availability" value={profile.isBusy || currentOrder ? "Busy" : profile.isAvailble ? "Online" : "Offline"} detail={profile.isBusy || currentOrder ? "Not receiving requests during delivery" : profile.isAvailble ? "Receiving nearby requests" : "Not receiving requests"} active={profile.isAvailble} />
          <RiderSummaryCard icon={<FiShield />} label="Partner status" value={profile.isVerified ? "Verified" : "In review"} detail={profile.isVerified ? "Profile is approved" : "Awaiting profile review"} active={profile.isVerified} />
          <RiderSummaryCard icon={<FiPackage />} label="Active delivery" value={currentOrder ? `#${currentOrder._id.slice(-6)}` : "No active order"} detail={currentOrder ? currentOrder.status.replaceAll("_", " ") : "Your next delivery starts here"} active={Boolean(currentOrder)} />
        </section>

        {!audioUnlocked && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#DFE9E1] bg-[#ECF4EE] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-[#557A69] shadow-sm"><FiVolume2 /></span>
              <div>
                <p className="font-semibold text-[#365343]">Turn on order alerts</p>
                <p className="mt-0.5 text-sm text-[#73857A]">Enable sound so you don’t miss a new delivery request.</p>
              </div>
            </div>
            <button type="button" onClick={unlockAudio} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#557A69] px-4 text-sm font-semibold text-white transition hover:bg-[#426452] sm:self-auto">
              <FiBell />
              Enable sound
            </button>
          </motion.section>
        )}

        {profile.isAvailble && !profile.isBusy && !currentOrder && incomingOrders.length > 0 && (
          <section className="mt-7">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64816F]">Just arrived</p>
                <h2 className="mt-1 text-xl font-semibold text-[#2D3C34]">Delivery requests</h2>
              </div>
              <span className="rounded-full bg-[#E4F0E7] px-3 py-1.5 text-xs font-bold text-[#3D6B4E]">{incomingOrders.length} new</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {incomingOrders.map((id) => (
                <RiderOrderRequest
                  key={id}
                  orderId={id}
                  onResolved={() => resolveIncomingOrder(id)}
                  onExpired={() => removeIncomingOrder(id)}
                />
              ))}
            </div>
          </section>
        )}

        {currentOrder ? (
          <section className="mt-7">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64816F]">On the road</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#2D3C34]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Your active delivery</h2>
              </div>
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-[#E2E9E2] bg-white px-3 py-2 text-xs font-semibold capitalize text-[#557A69]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#69A47B]" />
                {currentOrder.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="grid items-start gap-4 xl:grid-cols-[0.82fr_1.18fr]">
              <article className="overflow-hidden rounded-[1.5rem] border border-[#E3E9E2] bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 bg-[#F8FAF7] px-5 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#8A968E]">Order reference</p>
                    <p className="mt-1 font-semibold text-[#34443A]">#{currentOrder._id.slice(-6)}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#64816F] shadow-sm"><FiTruck /></span>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF4EE] text-[#557A69]"><FiUser /></span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#939D96]">Customer</p>
                      <p className="mt-1 truncate text-sm font-semibold text-[#35443B]">{currentOrder.customerName || "Customer"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FBF2E9] text-[#AF713C]"><FiMapPin /></span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#939D96]">{currentOrder.status === "picked_up" ? "Customer destination" : "Pickup location"}</p>
                      <p className="mt-1 text-sm leading-5 text-[#536159]">
                        {currentOrder.status === "picked_up"
                          ? currentOrder.deliveryAddress.formattedAddress || "Customer address unavailable"
                          : currentOrder.businessAddress || "Business address unavailable"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F5F8F4] p-4">
                    <div>
                      <p className="text-xs text-[#87938B]">Order total</p>
                      <p className="mt-1 text-lg font-semibold text-[#35443B]">₹{currentOrder.totalAmount}</p>
                    </div>
                    <div className="border-l border-[#E2EAE2] pl-4">
                      <p className="flex items-center gap-1 text-xs text-[#87938B]"><FiDollarSign /> Your earning</p>
                      <p className="mt-1 text-lg font-semibold text-[#43704F]">₹{currentOrder.riderAmount}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${currentOrder.deliveryAddress.mobile}`}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E2E9E2] px-4 text-sm font-semibold text-[#506258] transition hover:border-[#B8CCBD] hover:bg-[#F7FAF7]"
                  >
                    <FiPhone />
                    Call customer · {currentOrder.deliveryAddress.mobile}
                  </a>
                  <button
                    type="button"
                    onClick={updateCurrentOrder}
                    disabled={updatingOrder}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#557A69] px-4 text-sm font-bold text-white shadow-[0_10px_22px_-14px_rgba(63,105,78,0.8)] transition hover:-translate-y-0.5 hover:bg-[#456653] disabled:cursor-wait disabled:opacity-60"
                  >
                    {updatingOrder ? "Updating delivery..." : currentOrder.status === "rider_assigned" ? "Reached pickup location" : currentOrder.status === "reached" ? "Mark as picked up" : "Mark as delivered"}
                    {!updatingOrder && <FiChevronRight />}
                  </button>
                </div>
              </article>
              <RiderOrderMap order={currentOrder} />
            </div>
          </section>
        ) : (
          <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-[#E3E9E2] bg-white shadow-sm">
            <div className="grid items-center gap-5 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF4EE] text-xl text-[#557A69]"><FiNavigation /></span>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#64816F]">Your next trip awaits</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#2D3C34]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {profile.isAvailble ? "You’re ready for your next delivery." : "A new route is just around the corner."}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#78847D]">
                  {profile.isAvailble ? "Keep your location on and stay close to a restaurant hotspot. New requests will show up here." : "Go online whenever you’re ready. We’ll show nearby delivery requests right here."}
                </p>
              </div>
              <div className="hidden h-24 w-24 items-center justify-center rounded-full border border-dashed border-[#D8E4DA] bg-[#F7FAF7] text-4xl text-[#76927D] lg:flex">
                <FiTruck />
              </div>
            </div>
          </section>
        )}

        <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-[#9AA39D]">
          <FiHeadphones />
          Need help? Keep this workspace open while you’re online.
        </footer>
      </div>
    </motion.main>
  )
}

const RiderSummaryCard = ({
  icon,
  label,
  value,
  detail,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  active: boolean;
}) => (
  <article className="rounded-2xl border border-[#E3E9E2] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-[#78847D]">{label}</p>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-[#EDF4EE] text-[#557A69]" : "bg-[#F3F4F2] text-[#89938C]"}`}>{icon}</span>
    </div>
    <p className="mt-3 text-xl font-semibold capitalize tracking-tight text-[#304037]">{value}</p>
    <p className="mt-1 text-xs text-[#98A19B]">{detail}</p>
  </article>
);

export default RiderDashboard;
