import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiCheckCircle, FiDollarSign, FiEdit2, FiLoader, FiMapPin, FiPhone, FiRefreshCw, FiSave, FiShield, FiX } from "react-icons/fi";
import axios from "axios";
import toast from "react-hot-toast";
import { businessService } from "../config";
import { useAppData } from "../context/AppContext";
import type { IBusiness } from "../types";
import logo from "../assets/logo.png";

interface Props {
    business: IBusiness;
    isMerchant: boolean;
    onUpdate: (business: IBusiness) => void;
}

const BusinessProfile = ({ business, isMerchant, onUpdate }: Props) => {
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(business.name);
    const [description, setDescription] = useState(business.description ?? "");
    const [isOpen, setIsOpen] = useState(business.isOpen);
    const [saving, setSaving] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingLocation, setUpdatingLocation] = useState(false);
    const [editingAddress, setEditingAddress] = useState(false);
    const [addressDraft, setAddressDraft] = useState(business.autoLocation.formattedAddress);
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [payoutSaving, setPayoutSaving] = useState(false);
    const [payoutError, setPayoutError] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [upiId, setUpiId] = useState("");
    const [upiQrCode, setUpiQrCode] = useState<File | null>(null);
    const [savedUpiQrCode, setSavedUpiQrCode] = useState<string | null>(null);
    const { refreshLocation } = useAppData();

    useEffect(() => {
        if (!isMerchant) return;
        let isCurrent = true;
        setPayoutLoading(true);
        void axios.get<{
            accountNumber: string;
            ifscCode: string;
            upiId: string;
            upiQrCode: string | null;
        }>(`${businessService}/api/business/payout`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then(({ data }) => {
            if (!isCurrent) return;
            setAccountNumber(data.accountNumber);
            setIfscCode(data.ifscCode);
            setUpiId(data.upiId);
            setSavedUpiQrCode(data.upiQrCode);
            setPayoutError("");
        }).catch((error: unknown) => {
            if (!isCurrent) return;
            console.error("Failed to load merchant payout details:", error);
            setPayoutError("Payout details could not be loaded. Please refresh the page.");
        }).finally(() => {
            if (isCurrent) setPayoutLoading(false);
        });
        return () => {
            isCurrent = false;
        };
    }, [isMerchant]);

    const startEditing = () => {
        setName(business.name);
        setDescription(business.description ?? "");
        setEditMode(true);
    };

    const cancelEditing = () => {
        setName(business.name);
        setDescription(business.description ?? "");
        setEditMode(false);
    };

    const saveChanges = async () => {
        const cleanName = name.trim();
        if (!cleanName) {
            toast.error("Business name cannot be empty");
            return;
        }

        try {
            setSaving(true);
            const { data } = await axios.put<{ message: string; business: IBusiness }>(
                `${businessService}/api/business/edit`,
                { name: cleanName, description: description.trim() },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
            );
            setName(data.business.name);
            setDescription(data.business.description ?? "");
            onUpdate(data.business);
            setEditMode(false);
            toast.success(data.message);
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            toast.error(message || "Unable to update your business profile");
        } finally {
            setSaving(false);
        }
    };

    const toggleOpenStatus = async () => {
        try {
            setUpdatingStatus(true);
            const { data } = await axios.put<{ message: string; business: IBusiness }>(
                `${businessService}/api/business/status`,
                { status: !isOpen },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
            );
            setIsOpen(data.business.isOpen);
            onUpdate(data.business);
            toast.success(data.message);
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            toast.error(message || "Unable to update business availability");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const updateLocation = async () => {
        try {
            setUpdatingLocation(true);
            const location = await refreshLocation();
            if (!location) {
                toast.error("Unable to get your precise address. Check location permission and try again.");
                return;
            }
            const { data } = await axios.put<{ message: string; business: IBusiness }>(
                `${businessService}/api/business/location`,
                location,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
            );
            onUpdate(data.business);
            toast.success(data.message);
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            toast.error(message || "Unable to update your business address");
        } finally {
            setUpdatingLocation(false);
        }
    };

    const saveAddress = async () => {
        const formattedAddress = addressDraft.trim();
        if (!formattedAddress) {
            toast.error("Enter your complete business address");
            return;
        }

        try {
            setUpdatingLocation(true);
            const { data } = await axios.put<{ message: string; business: IBusiness }>(
                `${businessService}/api/business/location`,
                { formattedAddress },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
            );
            onUpdate(data.business);
            setAddressDraft(formattedAddress);
            setEditingAddress(false);
            toast.success(data.message);
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            toast.error(message || "Unable to save your business address");
        } finally {
            setUpdatingLocation(false);
        }
    };

    const savePayoutDetails = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const cleanAccountNumber = accountNumber.trim();
        const cleanIfscCode = ifscCode.trim().toUpperCase();
        const cleanUpiId = upiId.trim();
        if (!/^\d{6,20}$/.test(cleanAccountNumber)) {
            toast.error("Enter a valid bank account number");
            return;
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfscCode)) {
            toast.error("Enter a valid IFSC code");
            return;
        }
        if (cleanUpiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(cleanUpiId)) {
            toast.error("Enter a valid UPI ID");
            return;
        }
        if (!cleanUpiId && !upiQrCode && !savedUpiQrCode) {
            toast.error("Provide a UPI ID or upload your UPI QR code");
            return;
        }

        const formData = new FormData();
        formData.append("accountNumber", cleanAccountNumber);
        formData.append("ifscCode", cleanIfscCode);
        if (cleanUpiId) formData.append("upiId", cleanUpiId);
        if (upiQrCode) formData.append("upiQrCode", upiQrCode);

        try {
            setPayoutSaving(true);
            const { data } = await axios.put<{ message: string; upiQrCode: string | null }>(
                `${businessService}/api/business/payout`,
                formData,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
            );
            setSavedUpiQrCode(data.upiQrCode);
            setUpiQrCode(null);
            toast.success(data.message);
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            toast.error(message || "Unable to save payout details");
        } finally {
            setPayoutSaving(false);
        }
    };

    const createdDate = new Date(business.createdAt);
    const createdLabel = Number.isNaN(createdDate.getTime())
        ? "Recently added"
        : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(createdDate);

    return (
        <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="min-h-screen bg-[#f2f4f2] px-3 py-4 text-[#252b27] sm:px-6 sm:py-7"
        >
            <div className="mx-auto max-w-7xl">
                <header className="mb-5 flex items-center justify-between rounded-lg border border-[#e0e5e1] bg-white px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5">
                        <img src={logo} alt="SanX logo" className="h-10 w-10 object-contain" />
                        <div>
                            <p className="text-xl leading-5 font-semibold text-[#AF6028]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>SanX</p>
                            <p className="mt-1 text-[9px] font-semibold tracking-[0.14em] text-[#858e88]">MERCHANT CONSOLE</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-md border border-[#dce9de] bg-[#f5faf5] px-3 py-2 text-[10px] font-bold tracking-widest text-[#36824b]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#43a663]" /> YOUR LISTING
                    </span>
                </header>

                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.05 }}
                    className="relative isolate overflow-hidden rounded-lg bg-[#202724] shadow-[0_18px_50px_-35px_rgba(22,33,27,0.55)]"
                >
                    {business.image && <img src={business.image} alt={`${business.name} cover`} className="absolute inset-0 -z-20 h-full w-full object-cover" />}
                    <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(22,30,26,0.94)_0%,rgba(22,30,26,0.78)_54%,rgba(22,30,26,0.38)_100%)]" />
                    <div className="flex min-h-82.5 flex-col justify-between gap-8 p-5 sm:p-8 lg:min-h-90 lg:p-10">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="rounded-md border border-white/20 bg-black/15 px-3 py-2 font-mono text-[10px] font-medium tracking-widest text-white/80">MERCHANT PROFILE <span className="px-1 text-white/40">/</span> {business._id.slice(-8).toUpperCase()}</span>
                            <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[10px] font-bold tracking-widest ${isOpen ? "border-[#b9e1c1]/40 bg-[#173a25]/75 text-[#d4f0da]" : "border-white/20 bg-black/20 text-white/85"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-[#68cc80]" : "bg-white/60"}`} /> {isOpen ? "OPEN NOW" : "CURRENTLY CLOSED"}
                            </span>
                        </div>

                        <div className="max-w-3xl">
                            <p className="mb-3 text-[10px] font-bold tracking-[0.16em] text-white/60">YOUR BUSINESS ON SANX</p>
                            {editMode ? (
                                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} aria-label="Business name" className="w-full rounded-md border border-white/25 bg-black/20 px-3 py-2 text-3xl font-semibold text-white outline-none placeholder:text-white/50 focus:border-white/60 sm:text-4xl" />
                            ) : (
                                <h1 className="wrap-break-word text-3xl leading-tight font-semibold tracking-tight text-white sm:text-5xl">{business.name}</h1>
                            )}
                            {editMode ? (
                                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} aria-label="Business description" placeholder="Describe what makes your business special" className="mt-4 w-full resize-y rounded-md border border-white/25 bg-black/20 px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/60 focus:border-white/60" />
                            ) : (
                                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">{business.description || "Add a short introduction to help customers get to know your business."}</p>
                            )}
                            <p className="mt-5 flex items-start gap-2 text-sm leading-5 text-white/75"><FiMapPin className="mt-0.5 shrink-0 text-[#f4a36d]" size={16} />{business.autoLocation.formattedAddress || "Location unavailable"}</p>
                        </div>

                        {isMerchant && (
                            <div className="flex flex-wrap items-center gap-2">
                                {editMode ? (
                                    <>
                                        <button type="button" onClick={saveChanges} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#e23744] px-4 text-sm font-semibold text-white transition hover:bg-[#c92e3a] disabled:cursor-wait disabled:opacity-70">
                                            {saving ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />} {saving ? "Saving..." : "Save changes"}
                                        </button>
                                        <button type="button" onClick={cancelEditing} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/25 bg-black/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"><FiX size={16} /> Cancel</button>
                                    </>
                                ) : (
                                    <button type="button" onClick={startEditing} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/30 bg-black/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10"><FiEdit2 size={15} /> Edit profile</button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.section>

                <motion.section
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } } }}
                    className="mt-5 grid gap-px overflow-hidden rounded-lg border border-[#e0e5e1] bg-[#e0e5e1] sm:grid-cols-3"
                >
                    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} className="bg-white px-5 py-4 sm:px-6">
                        <p className="text-[10px] font-bold tracking-[0.12em] text-[#87908a]">VISIBILITY</p>
                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#28312b]"><span className={`h-2 w-2 rounded-full ${isOpen ? "bg-[#43a663]" : "bg-[#a2aaa4]"}`} />{isOpen ? "Open for customers" : "Closed right now"}</p>
                    </motion.div>
                    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} className="bg-white px-5 py-4 sm:px-6">
                        <p className="text-[10px] font-bold tracking-[0.12em] text-[#87908a]">VERIFICATION</p>
                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#28312b]"><FiShield className={business.isVerified ? "text-[#36824b]" : "text-[#AF6028]"} size={16} />{business.isVerified ? "Verified business" : "Verification pending"}</p>
                    </motion.div>
                    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} className="bg-white px-5 py-4 sm:px-6">
                        <p className="text-[10px] font-bold tracking-[0.12em] text-[#87908a]">ON SANX SINCE</p>
                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#28312b]"><FiCalendar className="text-[#AF6028]" size={16} />{createdLabel}</p>
                    </motion.div>
                </motion.section>

                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }} className="rounded-lg border border-[#e0e5e1] bg-white p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3 border-b border-[#edf0ed] pb-4">
                            <div>
                                <p className="text-[10px] font-bold tracking-[0.13em] text-[#AF6028]">BUSINESS DETAILS</p>
                                <h2 className="mt-1 text-lg font-semibold text-[#28312b]">Public information</h2>
                            </div>
                            <span className="rounded-md bg-[#f4f6f4] px-2.5 py-1.5 font-mono text-[10px] text-[#747d77]">ID {business._id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="divide-y divide-[#edf0ed]">
                            <div className="flex items-start gap-3 py-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f8f2ed] text-[#AF6028]"><FiPhone size={16} /></span>
                                <div className="min-w-0"><p className="text-[10px] font-bold tracking-widest text-[#87908a]">CUSTOMER CONTACT</p><p className="mt-1 break-all text-sm font-medium text-[#343c37]">{business.phone}</p></div>
                            </div>
                            <div className="flex items-start gap-3 py-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f8f2ed] text-[#AF6028]"><FiMapPin size={16} /></span>
                                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold tracking-widest text-[#87908a]">BUSINESS ADDRESS</p>{isMerchant && <div className="flex flex-wrap gap-2">{!editingAddress && <button type="button" onClick={() => { setAddressDraft(business.autoLocation.formattedAddress); setEditingAddress(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e1e5df] px-2.5 text-xs font-medium text-[#626b65] transition hover:border-[#AF6028] hover:text-[#AF6028]"><FiEdit2 size={13} />Enter exact address</button>}<button type="button" onClick={updateLocation} disabled={updatingLocation || editingAddress} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e1e5df] px-2.5 text-xs font-medium text-[#626b65] transition hover:border-[#AF6028] hover:text-[#AF6028] disabled:cursor-wait disabled:opacity-60">{updatingLocation ? <FiLoader className="animate-spin" size={13} /> : <FiRefreshCw size={13} />}{updatingLocation ? "Updating..." : "Refresh GPS"}</button></div>}</div>{editingAddress ? <><textarea value={addressDraft} onChange={(event) => setAddressDraft(event.target.value)} maxLength={300} rows={3} aria-label="Exact business address" placeholder="House or shop, street, area, city, state, PIN code" className="mt-2 w-full resize-y rounded-md border border-[#dce2dd] bg-white px-3 py-2 text-sm leading-5 text-[#343c37] outline-none focus:border-[#AF6028]" /><div className="mt-2 flex gap-2"><button type="button" onClick={saveAddress} disabled={updatingLocation} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#36824b] px-3 text-xs font-semibold text-white disabled:opacity-60">{updatingLocation ? <FiLoader className="animate-spin" size={13} /> : <FiSave size={13} />}Save address</button><button type="button" onClick={() => { setAddressDraft(business.autoLocation.formattedAddress); setEditingAddress(false); }} disabled={updatingLocation} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e1e5df] px-3 text-xs font-medium text-[#626b65] disabled:opacity-60"><FiX size={13} />Cancel</button></div></> : <p className="mt-1 text-sm leading-5 text-[#343c37]">{business.autoLocation.formattedAddress || "Location unavailable"}</p>}<p className="mt-1 font-mono text-[10px] text-[#929a94]">{business.autoLocation.coordinates[1].toFixed(5)}, {business.autoLocation.coordinates[0].toFixed(5)}</p></div>
                            </div>
                        </div>
                    </motion.section>

                    {isMerchant && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }} className="rounded-lg border border-[#e0e5e1] bg-white p-5 sm:p-6">
                            <p className="text-[10px] font-bold tracking-[0.13em] text-[#AF6028]">STORE AVAILABILITY</p>
                            <h2 className="mt-1 text-lg font-semibold text-[#28312b]">Opening status</h2>
                            <p className="mt-2 text-sm leading-5 text-[#737b76]">Control whether customers see your business as open right now.</p>
                            <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-[#e8ece8] bg-[#fafbfa] p-3.5">
                                <div className="min-w-0"><p className="text-sm font-semibold text-[#303833]">{isOpen ? "Currently open" : "Currently closed"}</p><p className="mt-0.5 text-xs text-[#858e88]">{isOpen ? "Visible as open on your listing" : "Visible as closed on your listing"}</p></div>
                                <button type="button" role="switch" aria-checked={isOpen} aria-label="Toggle business open status" onClick={toggleOpenStatus} disabled={updatingStatus} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AF6028] disabled:cursor-wait disabled:opacity-60 ${isOpen ? "bg-[#36824b]" : "bg-[#bcc3bd]"}`}>
                                    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isOpen ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                            </div>
                            <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#858e88]"><FiCheckCircle className="mt-0.5 shrink-0 text-[#36824b]" size={14} />Availability changes are saved to your business profile.</div>
                        </motion.section>
                    )}
                </div>
                {isMerchant && (
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.28 }}
                        className="mt-5 rounded-lg border border-[#e0e5e1] bg-white p-5 sm:p-6"
                    >
                        <div className="flex items-start gap-3 border-b border-[#edf0ed] pb-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#f8f2ed] text-[#AF6028]"><FiDollarSign /></span>
                            <div>
                                <p className="text-[10px] font-bold tracking-[0.13em] text-[#AF6028]">PAYOUT SETTINGS</p>
                                <h2 className="mt-1 text-lg font-semibold text-[#28312b]">Where should your earnings be sent?</h2>
                                <p className="mt-1 text-sm text-[#737b76]">These private details are only shown to you and the admin for settlement.</p>
                            </div>
                        </div>
                        {payoutError && <p role="alert" className="mt-4 text-sm text-red-700">{payoutError}</p>}
                        {payoutLoading ? (
                            <p className="mt-4 text-sm text-[#737b76]">Loading payout details…</p>
                        ) : (
                            <form onSubmit={(event) => void savePayoutDetails(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-semibold">Bank account number</span>
                                    <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} inputMode="numeric" maxLength={20} autoComplete="off" className="h-11 w-full rounded-md border border-[#dce2dd] px-3 text-sm outline-none focus:border-[#AF6028]" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-semibold">IFSC code</span>
                                    <input value={ifscCode} onChange={(event) => setIfscCode(event.target.value.toUpperCase())} maxLength={11} autoComplete="off" className="h-11 w-full rounded-md border border-[#dce2dd] px-3 text-sm uppercase outline-none focus:border-[#AF6028]" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-semibold">UPI ID <span className="font-normal text-[#858e88]">optional if QR is available</span></span>
                                    <input value={upiId} onChange={(event) => setUpiId(event.target.value)} autoComplete="off" placeholder="name@bank" className="h-11 w-full rounded-md border border-[#dce2dd] px-3 text-sm outline-none focus:border-[#AF6028]" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-semibold">UPI QR code <span className="font-normal text-[#858e88]">optional if UPI ID is available</span></span>
                                    <input type="file" accept="image/*" onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null;
                                        if (file && !file.type.startsWith("image/")) {
                                            toast.error("Choose an image file for your UPI QR code");
                                            event.target.value = "";
                                            return;
                                        }
                                        if (file && file.size > 5 * 1024 * 1024) {
                                            toast.error("UPI QR code must be 5 MB or smaller");
                                            event.target.value = "";
                                            return;
                                        }
                                        setUpiQrCode(file);
                                    }} className="block w-full text-xs text-[#626b65] file:mr-3 file:rounded-md file:border-0 file:bg-[#f4f6f4] file:px-3 file:py-2 file:text-xs file:font-semibold" />
                                    {savedUpiQrCode && <a href={savedUpiQrCode} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#AF6028] underline">View saved QR</a>}
                                    {upiQrCode && <span className="mt-2 block truncate text-xs text-[#737b76]">{upiQrCode.name}</span>}
                                </label>
                                <div className="sm:col-span-2">
                                    <button type="submit" disabled={payoutSaving || payoutLoading} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#36824b] px-4 text-sm font-semibold text-white disabled:opacity-60">
                                        {payoutSaving ? <FiLoader className="animate-spin" /> : <FiSave />}
                                        {payoutSaving ? "Saving payout details…" : "Save payout details"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.section>
                )}
            </div>
        </motion.main>
    );
};

export default BusinessProfile;