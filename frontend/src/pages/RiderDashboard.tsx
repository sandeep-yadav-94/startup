import { useCallback, useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService } from "../main";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiCheckCircle,
  FiFileText,
  FiLock,
  FiMapPin,
  FiPhone,
  FiTruck,
  FiUploadCloud,
  FiUser,
} from "react-icons/fi";
import type { IOrder } from "../types";
import audio from "../assets/mangaletp-funny-laughing-406018.mp3";
import RiderOrderRequest from "../components/RiderOrderRequest";

export interface IRider {

  _id : string;
  phoneNumber : string;
  addharNumber : string;
  drivingLicenseNumber : string;
  isVerified : boolean;
  isAvailble : boolean;
  picture : string;

}

const RiderDashboard = () => {

  const {user} = useAppData();
  const {socket} = useSocket();

  const [profile, setProfile] = useState<IRider | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

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
  socket.on("order:available", onOrderAvailable);
  return ()=>{
    socket.off("order:available", onOrderAvailable);
  }
}, [socket, audioUnlocked])

  const fetchProfile = useCallback(async () => {
  try {
    setLoading(true);

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
    setLoading(false);
  }
}, []);


useEffect(()=>{
  if(user?.role === "rider"){
    void Promise.resolve().then(fetchProfile);
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
    setCurrentOrder(null);
  }
}, []);

useEffect(()=>{
  if (user?.role === "rider") void Promise.resolve().then(fetchCurrentOrder);
}, [user?.role, fetchCurrentOrder]);

useEffect(() => {
  if (!socket) return;

  const onOrderAssigned = (order: IOrder) => {
    setCurrentOrder(order);
    setIncomingOrders([]);
    incomingOrderIds.current.clear();
    void fetchProfile();
    void fetchCurrentOrder();
  };
  const onOrderUpdated = () => {
    void fetchCurrentOrder();
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
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    toast.success(data.message);
    await fetchCurrentOrder();
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
  void fetchProfile();
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
const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
const [image, setImage] = useState<File | null>(null);
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

  if (image.size > 5 * 1024 * 1024) {
    toast.error("Rider image must be 5 MB or smaller");
    return;
  }

  setSubmitting(true)
  navigator.geolocation.getCurrentPosition(async(pos) =>{

    const formData = new FormData();

    formData.append("phoneNumber", phoneNumber);
    formData.append("addharNumber", addharNumber);
    formData.append("drivingLicenseNumber", drivingLicenseNumber);
    formData.append("latitude", pos.coords.latitude.toString());
    formData.append("longitude", pos.coords.longitude.toString());
    formData.append("file", image);

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
  return <div className="flex min-h-[60vh] items-center justify-center text-gray-500">You are not register as Rider</div>
}


if(loading){
  return <div className="flex min-h-[60vh] items-center justify-center text-gray-500">Loading Rider Details...</div>
}


if (!profile) {
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#F4F5F0] px-4 py-8 text-[#302A24] sm:px-7 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/Sushmap.jpg" alt="Sushmap" className="h-11 w-11 object-contain" />
            <div>
              <p
                className="text-xl font-semibold leading-5 text-[#AF6028]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Sushmap
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[#8B8177]">
                RIDER PARTNER
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E6D7C8] bg-white/80 px-3 py-2 text-xs font-medium text-[#746C63]">
            <FiLock className="text-[#AF6028]" />
            Secure registration
          </span>
        </div>

        <div className="grid overflow-hidden rounded-[1.75rem] border border-[#E6E0D7] bg-white shadow-[0_24px_70px_-44px_rgba(48,42,36,0.42)] lg:grid-cols-[0.82fr_1.18fr]">
          <section className="relative overflow-hidden bg-[#302A24] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-11 lg:py-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-8 h-48 w-48 rounded-full border border-white/10"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-[#E8C4A5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D98A4B]" />
                PARTNER ONBOARDING
              </span>
              <h1
                className="mt-7 max-w-sm text-4xl leading-[1.12] font-medium sm:text-5xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Make every delivery count.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
                Join the Sushmap rider network and bring great local experiences closer to everyone.
              </p>

              <div className="mt-9 space-y-4">
                <div className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#AF6028]/25 text-[#E8B78F]">
                    <FiTruck size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">A smoother way to ride</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">Manage your rider profile in one place.</p>
                  </div>
                </div>
                <div className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#AF6028]/25 text-[#E8B78F]">
                    <FiCheckCircle size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Verified and ready</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">Submit your details for profile verification.</p>
                  </div>
                </div>
              </div>

              <div className="mt-9 flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/50">
                <FiLock className="shrink-0 text-[#D98A4B]" />
                <span>Your information is used to set up your rider account securely.</span>
              </div>
            </div>
          </section>

          <section className="px-5 py-7 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
            <div className="mx-auto max-w-xl">
              <div className="mb-8">
                <p className="text-xs font-bold tracking-[0.15em] text-[#AF6028]">YOUR PROFILE</p>
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
                    <label htmlFor="phoneNumber" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#403931]">
                      <FiPhone className="text-[#AF6028]" />
                      Phone number
                    </label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      required
                      className="min-h-12 w-full rounded-xl border border-[#E2DDD5] bg-[#FCFBF9] px-4 text-sm text-[#302A24] outline-none transition focus:border-[#AF6028] focus:bg-white focus:ring-4 focus:ring-[#AF6028]/10"
                      placeholder="+91 00000 00000"
                    />
                  </div>

                  <div>
                    <label htmlFor="addharNumber" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#403931]">
                      <FiFileText className="text-[#AF6028]" />
                      Aadhaar number
                    </label>
                    <input
                      id="addharNumber"
                      type="text"
                      value={addharNumber}
                      onChange={(event) => setAddharNumber(event.target.value)}
                      required
                      className="min-h-12 w-full rounded-xl border border-[#E2DDD5] bg-[#FCFBF9] px-4 text-sm text-[#302A24] outline-none transition focus:border-[#AF6028] focus:bg-white focus:ring-4 focus:ring-[#AF6028]/10"
                      placeholder="Enter Aadhaar number"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="drivingLicenseNumber" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#403931]">
                    <FiFileText className="text-[#AF6028]" />
                    Driving license number
                  </label>
                  <input
                    id="drivingLicenseNumber"
                    type="text"
                    value={drivingLicenseNumber}
                    onChange={(event) => setDrivingLicenseNumber(event.target.value)}
                    required
                    className="min-h-12 w-full rounded-xl border border-[#E2DDD5] bg-[#FCFBF9] px-4 text-sm text-[#302A24] outline-none transition focus:border-[#AF6028] focus:bg-white focus:ring-4 focus:ring-[#AF6028]/10"
                    placeholder="Enter driving license number"
                  />
                </div>

                <div>
                  <label htmlFor="riderPicture" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#403931]">
                    <FiUser className="text-[#AF6028]" />
                    Profile photo <span className="font-normal text-[#9A9188]">(required, max 5 MB)</span>
                  </label>
                  <label
                    htmlFor="riderPicture"
                    className="group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8C8B8] bg-[#FCFAF7] px-5 py-5 text-center transition hover:border-[#AF6028] hover:bg-[#FBF5EE]"
                  >
                    <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1E5D9] text-[#AF6028] transition group-hover:scale-105">
                      <FiUploadCloud size={20} />
                    </span>
                    <span className="text-sm font-semibold text-[#403931]">
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
                  className="group flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#AF6028] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(175,96,40,0.75)] transition hover:-translate-y-0.5 hover:bg-[#98501F] hover:shadow-[0_14px_26px_-12px_rgba(175,96,40,0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#AF6028]/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting your details..." : "Complete rider registration"}
                  {!submitting && <FiArrowRight className="transition-transform group-hover:translate-x-1" />}
                </button>
                <p className="text-center text-xs leading-5 text-[#8B8177]">
                  By submitting, you confirm that the information provided is accurate.
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}



  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="rounded-xl bg-white p-4 shadow space-y-4">
        <img src={profile.picture} alt="" className="mx-auto h-24 w-24 rounded-full object-cover"/>
        <p className="text-center font-semibold">{user?.name}</p>
        <p className="text-center text-sm text-gray-500">{profile.phoneNumber}</p>
        <div className="flex justify-center gap-2">
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">{profile.isVerified ? "Verified" : "pending"}</span>
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">{profile.isAvailble ? "Online" : "offline"}</span>
        </div>

        <div>
          <p className="text-blue-400">
            Please be within a 500 m radius of any restaurant (which we call a hotspot) before going online as a rider to recieve orders
          </p>
        </div>

        {
          profile.isVerified && <button onClick={toggleAvailibility} disabled={toggling} className={`w-full py-2 rounded-lg text-white font-semibold ${toggling ? "bg-gray-400" : profile.isAvailble ? "bg-gray-600" : "bg-[#e23744]"}`}>{toggling ? "Updting..." : profile.isAvailble ? "Go Offline" : "Go Online"}</button>
        }

       </div>
      </div>
      {!audioUnlocked && (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔊</span>
          <div>
            <p className="font-medium text-blue-800">
              Enable Audio Notifications
            </p>
            <p className="text-sm text-blue-700">
              Get Notified when a new order arrives..
            </p>
          </div>
        </div>
        <button
          onClick={unlockAudio}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Enable Audio
        </button>
      </div>
    )}

    {currentOrder && (
      <div className="mx-auto max-w-md rounded-xl border border-gray-100 bg-white p-4 shadow">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-800">Current order</h3>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
            {currentOrder.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">Order #{currentOrder._id.slice(-6)}</p>

        <div className="mt-4 space-y-3">
          <div className="flex gap-3">
            <FiUser className="mt-0.5 shrink-0 text-green-600" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pickup</p>
              <p className="text-sm font-semibold text-gray-800">{currentOrder.customerName || "Customer"}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FiMapPin className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Drop</p>
              <p className="text-sm text-gray-700">{currentOrder.businessAddress || "Business address unavailable"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
            <div>
              <p className="text-xs text-gray-500">Order total</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">₹{currentOrder.totalAmount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Your earning</p>
              <p className="mt-1 text-sm font-semibold text-green-700">₹{currentOrder.riderAmount}</p>
            </div>
          </div>
          <a
            href={`tel:${currentOrder.deliveryAddress.mobile}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiPhone />
            Call customer · {currentOrder.deliveryAddress.mobile}
          </a>
        </div>

        <button
          type="button"
          onClick={updateCurrentOrder}
          disabled={updatingOrder}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {updatingOrder
            ? "Updating..."
            : currentOrder.status === "rider_assigned"
              ? "Reached pickup location"
              : currentOrder.status === "reached"
                ? "Mark as picked up"
                : "Mark as delivered"}
        </button>
      </div>
    )}

    {
      profile.isAvailble && incomingOrders.length > 0 && <div className="mx-auto max-w-md px-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Incoming Orders</h3>
        {
          incomingOrders.map((id)=>(
            <RiderOrderRequest
              key={id}
              orderId={id}
              onResolved={() => resolveIncomingOrder(id)}
              onExpired={() => removeIncomingOrder(id)}
            />
          ))
        }
      </div>
    }

    

    </div>
  )
}

export default RiderDashboard;
