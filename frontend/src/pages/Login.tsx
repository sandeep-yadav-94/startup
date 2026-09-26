

import { useState } from "react"
import { useNavigate } from "react-router-dom";
import { authService } from "../config";
import axios from "axios";
import toast from "react-hot-toast";
import { useGoogleLogin } from '@react-oauth/google';
import {FcGoogle} from  "react-icons/fc"
import { motion, useReducedMotion } from "framer-motion";






const login = () => {

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();

    const responseGoogle = async (authResult: any) => {
        setLoading(true);
        try {
            const result = await axios.post(`${authService}/api/auth/login`, {
                code: authResult["code"],
            })
            localStorage.setItem("token", result.data.token);
            toast.success(result.data.message);
            setLoading(false);
            navigate("/");
        } catch (error) {
            console.log(error);
            toast.error("Failed to login");
        } finally {
            setLoading(false);
        }
    }

    const googleLogin = useGoogleLogin({
        onSuccess: responseGoogle,
        onError: responseGoogle,
        flow: 'auth-code',
    });

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#F4F5F0] text-[#302A24]">
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
                background: "radial-gradient(ellipse at 14% 20%, rgba(209, 102, 22, 0.15), transparent 38%), radial-gradient(ellipse at 88% 82%, rgba(193, 100, 31, 0.12), transparent 34%)",
            }}
        />
        <motion.div
            className="relative mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col lg:grid lg:grid-cols-[1.05fr_0.95fr]"
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
                className="flex flex-col justify-center px-6 pb-7 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10 lg:min-h-[100svh] lg:px-16 lg:py-16"
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
                        Find the local spots worth knowing, from a quick bite to your next favorite table.
                    </p>
                </div>
                <p className="mx-auto mt-10 hidden w-full max-w-xl text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A6A46] lg:mx-0 lg:mt-16 lg:block">
                    A little closer to somewhere good
                </p>
            </motion.section>

            <motion.section
                className="flex flex-1 items-center justify-center rounded-t-[30px] border-t border-[#DCDDD5] bg-white/60 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-16px_40px_-34px_rgba(48,42,36,0.38)] backdrop-blur-sm sm:px-10 lg:min-h-[100svh] lg:rounded-none lg:border-l lg:border-t-0 lg:bg-transparent lg:px-16 lg:py-16 lg:shadow-none lg:backdrop-blur-0"
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
                <div className="w-full max-w-md">
                    <div aria-hidden="true" className="mx-auto mb-6 h-1 w-10 rounded-full bg-[#DCDDD5] lg:hidden" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C1641F]">
                        Your next local favorite
                    </p>
                    <h2
                        className="mt-4 text-4xl font-medium leading-tight text-[#302A24] sm:text-5xl"
                        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                    >
                        Good places start here.
                    </h2>
                    <p className="mt-4 text-base leading-7 text-[#746C63]">
                        Log in or create an account to find your kind of place.
                    </p>

                    <motion.button
                        onClick={googleLogin}
                        disabled={loading}
                        aria-busy={loading}
                        whileHover={!shouldReduceMotion && !loading ? { y: -2 } : undefined}
                        whileTap={!shouldReduceMotion && !loading ? { scale: 0.985 } : undefined}
                        transition={{ type: "spring", stiffness: 420, damping: 28 }}
                        className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#DDDAD2] bg-white px-5 font-semibold text-[#302A24] shadow-[0_5px_18px_-12px_rgba(48,42,36,0.35)] transition-[border-color,box-shadow] duration-200 hover:border-[#C1641F]/50 hover:shadow-[0_16px_30px_-18px_rgba(175,96,40,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D16616]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F5F0] disabled:cursor-wait disabled:opacity-75 motion-reduce:transition-none"
                    >
                        {loading ? (
                            <span
                                role="status"
                                aria-label="Signing in"
                                className="h-5 w-5 animate-spin rounded-full border-2 border-[#AF6028]/25 border-t-[#AF6028]"
                            />
                        ) : (
                            <FcGoogle size={20} />
                        )}
                        {loading ? "Signing in..." : "Continue with Google"}
                    </motion.button>

                    <p className="mt-5 text-center text-[11px] leading-5 text-[#746C63] sm:text-xs sm:leading-6 lg:text-left">
                        By continuing, you agree to our{" "}
                        <a
                            href="/terms-of-service"
                            className="font-medium text-[#AF6028] underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D16616]/50"
                        >
                            Terms of Service
                        </a>{" "}
                        &amp;{" "}
                        <a
                            href="/privacy-policy"
                            className="font-medium text-[#AF6028] underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D16616]/50"
                        >
                            Privacy Policy
                        </a>.
                    </p>
                </div>
            </motion.section>
        </motion.div>
    </main>
  )
}

export default login