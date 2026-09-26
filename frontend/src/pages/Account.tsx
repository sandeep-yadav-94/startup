import { Link, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { BiChevronRight, BiEnvelope, BiLogOut, BiMap, BiPackage, BiShieldQuarter, BiUser } from "react-icons/bi";

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const Account = () => {
  const navigate = useNavigate();
  const { user, setUser, setIsAuth } = useAppData();
  const shouldReduceMotion = useReducedMotion();
  const userName = user?.name?.trim() || "Your account";
  const firstLetter = userName.charAt(0).toUpperCase();
  const userEmail = user?.email || "No email available";

  const logoutHandler = () => {
    localStorage.setItem("token", "");
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("Logout successfully");
  };

  return (
    <motion.main
      initial={shouldReduceMotion ? false : "hidden"}
      animate="visible"
      variants={pageVariants}
      className="min-h-[calc(100vh-64px)] bg-[#f3f4f5] px-4 py-8 sm:px-6 sm:py-12"
      style={{ backgroundImage: "linear-gradient(rgba(30, 41, 59, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.035) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
    >
      <div className="mx-auto max-w-6xl">
        <motion.header variants={itemVariants} className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[#D52F3D]">Personal space</p>
            <h1 className="text-3xl font-bold text-[#17191d] sm:text-4xl">Account</h1>
          </div>
          <div className="flex items-center gap-2 pb-1 text-xs font-medium text-gray-500">
            <BiShieldQuarter className="h-4 w-4 text-[#D52F3D]" aria-hidden="true" />
            <span>Profile overview</span>
          </div>
        </motion.header>

        <motion.section variants={itemVariants} className="relative isolate mb-6 overflow-hidden rounded-lg bg-[#191b20] px-6 py-7 text-white sm:px-9 sm:py-9" aria-labelledby="profile-heading">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1 bg-[#E23744]" />
          <div className="relative flex flex-wrap items-center gap-5 sm:gap-6">
            {user?.image ? (
              <img src={user.image} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-white/20 object-cover sm:h-24 sm:w-24" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-3xl font-semibold text-white sm:h-24 sm:w-24" aria-label={`Profile initial ${firstLetter}`}>
                {firstLetter}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium uppercase text-white/60">Your profile</p>
              <h2 id="profile-heading" className="break-words text-2xl font-semibold sm:text-3xl">{userName}</h2>
              <p className="mt-2 break-all text-sm text-white/65">{userEmail}</p>
            </div>
            <div className="hidden border-l border-white/15 pl-6 pr-4 text-right sm:block">
              <span className="block text-xs font-medium uppercase text-white/50">Account</span>
              <span className="mt-1 block text-sm font-medium text-white/90">Active profile</span>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.section variants={itemVariants} className="rounded-lg border border-gray-200/80 bg-white/95 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.045)] sm:p-8" aria-labelledby="details-heading">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-400">Profile details</p>
                <h2 id="details-heading" className="text-lg font-semibold text-[#191b20]">Personal information</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fce8e9] text-[#D52F3D]"><BiUser className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <dl className="divide-y divide-gray-100">
              <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <BiUser className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-gray-500">Full name</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-gray-900">{user?.name || "Not provided"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <BiEnvelope className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-gray-500">Email address</dt>
                  <dd className="mt-1 break-all text-sm font-semibold text-gray-900">{user?.email || "Not provided"}</dd>
                </div>
              </div>
            </dl>
          </motion.section>

          <motion.section variants={itemVariants} className="overflow-hidden rounded-lg border border-gray-200/80 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.045)]" aria-labelledby="account-links-heading">
            <div className="border-b border-gray-100 px-6 py-5 sm:px-7">
              <p className="mb-1 text-xs font-medium uppercase text-gray-400">Quick access</p>
              <h2 id="account-links-heading" className="text-lg font-semibold text-[#191b20]">Your activities</h2>
            </div>
            <nav aria-label="Account links" className="divide-y divide-gray-100 px-2">
              <motion.div whileHover={shouldReduceMotion ? undefined : { x: 4 }} transition={{ duration: 0.18 }}>
                <Link to="/orders" className="group flex items-center gap-4 rounded-md px-4 py-5 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E23744]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fce8e9] text-[#D52F3D]"><BiPackage className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">Your Bookings</span>
                    <span className="mt-1 block text-sm text-gray-500">View your order history</span>
                  </span>
                  <BiChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-[#D52F3D]" aria-hidden="true" />
                </Link>
              </motion.div>
              <motion.div whileHover={shouldReduceMotion ? undefined : { x: 4 }} transition={{ duration: 0.18 }}>
                <Link to="/address" className="group flex items-center gap-4 rounded-md px-4 py-5 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E23744]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e8f2f1] text-[#16756e]"><BiMap className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">Addresses</span>
                    <span className="mt-1 block text-sm text-gray-500">Manage your saved addresses</span>
                  </span>
                  <BiChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-[#16756e]" aria-hidden="true" />
                </Link>
              </motion.div>
            </nav>
            <div className="border-t border-gray-100 p-4 sm:px-6">
              <button type="button" onClick={logoutHandler} className="group flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-semibold text-[#B42332] transition-colors hover:bg-[#fff1f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23744]">
                <BiLogOut className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                Logout
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </motion.main>
  );
};

export default Account