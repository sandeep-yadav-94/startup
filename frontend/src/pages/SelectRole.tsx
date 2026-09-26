import { useState } from "react"
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../config";
import { motion, useReducedMotion } from "framer-motion";
import { FiCheck, FiCompass, FiMapPin, FiShoppingBag } from "react-icons/fi";


type Role = "customer" | "rider" | "merchant" | null;

const SelectRole = () => {

    const [role, setRole] = useState<Role>(null);
    const {setUser} = useAppData();
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();
    const roles:Role[] = ["customer", "rider",  "merchant"];

    const addRole = async()=>{
        try {
            const {data} = await axios.put(`${authService}/api/auth/add/role`, {role}, {
                headers:{
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            localStorage.setItem("token", data.token);
            setUser(data.user);
            navigate("/", {replace : true})
        } catch (error) {
            alert("Something went wrong");
            console.log(error);
        }
    }

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-[#F4F5F0] text-[#302A24]">
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
                background: "radial-gradient(ellipse at 14% 20%, rgba(209, 102, 22, 0.15), transparent 38%), radial-gradient(ellipse at 88% 82%, rgba(193, 100, 31, 0.12), transparent 34%)",
            }}
        />
        <motion.div
            className="relative mx-auto flex min-h-svh w-full max-w-360 flex-col lg:grid lg:grid-cols-[1.05fr_0.95fr]"
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: { duration: 0.45, ease: "easeOut", staggerChildren: 0.16 },
                },
            }}
        >
            <motion.section
                className="flex flex-col justify-center px-6 pb-7 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10 lg:min-h-svh lg:px-16 lg:py-16"
                variants={{
                    hidden: { opacity: 0, y: 14, scale: 0.99 },
                    visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                    },
                }}
            >
                <div className="mx-auto flex w-full max-w-xl items-center gap-4 lg:mx-0 lg:block">
                    <img
                        src="/Sushmap.jpg"
                        alt="Sushmap map pin, flame, and compass logo"
                        className="h-16 w-16 shrink-0 object-contain sm:h-18 sm:w-18 lg:mb-5 lg:h-24 lg:w-24"
                    />
                    <div>
                        <h1
                            className="text-4xl font-semibold leading-none text-[#AF6028] sm:text-5xl lg:text-6xl"
                            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                        >
                            Sushmap
                        </h1>
                        <p className="mt-1 text-xs font-medium leading-5 text-[#51483F] sm:text-sm lg:mt-5 lg:text-2xl lg:leading-relaxed">
                            Places. Tastes. Budgets. Found.
                        </p>
                    </div>
                    <p className="mt-3 hidden max-w-md text-sm leading-7 text-[#746C63] sm:text-base lg:block">
                        A local guide for the places, tastes, and budgets that feel like you.
                    </p>
                </div>
                <p className="mx-auto mt-10 hidden w-full max-w-xl text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A6A46] lg:mx-0 lg:mt-16 lg:block">
                    Find your place in the neighborhood
                </p>
            </motion.section>

            <motion.section
                aria-labelledby="role-heading"
                className="flex flex-1 items-center justify-center rounded-t-4xl border-t border-[#DCDDD5] bg-white/60 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 shadow-[0_-16px_40px_-34px_rgba(48,42,36,0.38)] backdrop-blur-sm sm:px-10 lg:min-h-svh lg:rounded-none lg:border-l lg:border-t-0 lg:bg-transparent lg:px-16 lg:py-16 lg:shadow-none lg:backdrop-blur-0"
                variants={{
                    hidden: { opacity: 0, y: 14, scale: 0.99 },
                    visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                    },
                }}
            >
                <div className="w-full max-w-lg">
                    <div aria-hidden="true" className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#DCDDD5] lg:hidden" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C1641F]">
                        Your next local favorite
                    </p>
                    <h2
                        id="role-heading"
                        className="mt-2 text-3xl font-medium leading-tight text-[#302A24] sm:text-4xl"
                        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                    >
                        Choose your role
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#746C63] sm:text-base">
                        Pick how you want to experience Sushmap.
                    </p>

                    <div role="group" aria-labelledby="role-heading" className="mt-5 grid gap-2.5 sm:mt-7 sm:gap-3">
                        {roles.map((r) => {
                            const isSelected = role === r;
                            const RoleIcon = r === "rider" ? FiMapPin : r === "merchant" ? FiShoppingBag : FiCompass;
                            const title = r === "customer" ? "Explore as a customer" : r === "rider" ? "Deliver as a rider" : "Join as a merchant";
                            const description = r === "customer"
                                ? "Find local favorites for your taste and budget."
                                : r === "rider"
                                    ? "Bring great local finds right to people."
                                    : "Put your local business on the map.";

                            return (
                                <motion.button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    aria-pressed={isSelected}
                                    whileHover={!shouldReduceMotion ? { y: -2 } : undefined}
                                    whileTap={!shouldReduceMotion ? { scale: 0.99 } : undefined}
                                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                                    className={`group flex min-h-22 w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D16616]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F5F0] sm:min-h-25 sm:gap-4 sm:p-4 motion-reduce:transition-none ${
                                        isSelected
                                            ? "border-[#C1641F] bg-[#FFEFD4]/80 shadow-[0_10px_28px_-20px_rgba(175,96,40,0.8)]"
                                            : "border-[#DDDAD2] bg-white/80 hover:border-[#C1641F]/55 hover:bg-white hover:shadow-[0_12px_28px_-22px_rgba(175,96,40,0.65)]"
                                    }`}
                                >
                                    <span
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors sm:h-12 sm:w-12 ${
                                            isSelected ? "bg-[#AF6028] text-[#FFEFD4]" : "bg-[#F4F5F0] text-[#AF6028] group-hover:bg-[#FFEFD4]"
                                        }`}
                                    >
                                        <RoleIcon size={21} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-[#302A24] sm:text-base">
                                            {title}
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-4 text-[#746C63] sm:text-sm sm:leading-5">
                                            {description}
                                        </span>
                                    </span>
                                    <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                            isSelected ? "border-[#AF6028] bg-[#AF6028] text-white" : "border-[#CFCBC3] text-transparent"
                                        }`}
                                    >
                                        <FiCheck size={14} aria-hidden="true" />
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>

                    <motion.button
                        disabled={!role}
                        onClick={addRole}
                        whileHover={!shouldReduceMotion && role ? { y: -2 } : undefined}
                        whileTap={!shouldReduceMotion && role ? { scale: 0.985 } : undefined}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                        className={`mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold transition-[background-color,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D16616]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F5F0] sm:mt-5 sm:text-base motion-reduce:transition-none ${
                            role
                                ? "bg-[#AF6028] text-white shadow-[0_8px_22px_-12px_rgba(175,96,40,0.75)] hover:bg-[#C1641F] hover:shadow-[0_14px_28px_-14px_rgba(175,96,40,0.72)]"
                                : "cursor-not-allowed bg-[#E3E2DC] text-[#969087]"
                        }`}
                    >
                        Next
                    </motion.button>
                </div>
            </motion.section>
        </motion.div>
    </main>
  )
}

export default SelectRole