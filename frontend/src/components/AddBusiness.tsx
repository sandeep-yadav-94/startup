import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiCamera, FiCheck, FiCheckCircle, FiFileText, FiHome, FiImage, FiLoader, FiMapPin, FiNavigation, FiPhone, FiRefreshCw } from "react-icons/fi";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { businessService } from "../config";
import axios from "axios";
import type { IBusiness } from "../types";

interface props {
    fetchmyBusiness :()=> Promise<void>;
}

const AddBusiness = ({fetchmyBusiness}:props) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [createdBusiness, setCreatedBusiness] = useState<IBusiness | null>(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { city, loadingLocation, location, refreshLocation } = useAppData();

    useEffect(() => () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
    }, [imagePreview]);

    const selectImage = (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Choose an image file to continue");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be 5 MB or smaller");
            return;
        }
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const cleanName = name.trim();
        const cleanPhone = phone.replace(/\D/g, "");

        if (!cleanName) {
            toast.error("Enter your business name");
            return;
        }
        if (!/^\d{7,15}$/.test(cleanPhone)) {
            toast.error("Enter a phone number with 7 to 15 digits");
            return;
        }
        if (!image) {
            toast.error("Add a business photo to continue");
            return;
        }
        if (!location) {
            toast.error("Your location is needed to add your business");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Please sign in again before adding your business");
            return;
        }

        const formData = new FormData();
        formData.append("name", cleanName);
        formData.append("description", description.trim());
        formData.append("latitude", String(location.latitude));
        formData.append("longitude", String(location.longitude));
        formData.append("formattedAddress", location.formattedAddress);
        formData.append("file", image);
        formData.append("phone", cleanPhone);

        try {
            setSubmitting(true);
            const { data } = await axios.post<{ business: IBusiness }>(`${businessService}/api/business/new`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            // console.log("Add business response:\n", JSON.stringify(data, null, 2));
            // console.log("Business ID:", data.business?._id ?? "missing from response");
            setCreatedBusiness(data.business);
            toast.success("Your business is live on Sushmap");
            fetchmyBusiness();
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            toast.error(message || "We couldn't save your business. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        selectImage(event.dataTransfer.files[0]);
    };

    const phoneReady = /^\d{7,15}$/.test(phone.replace(/\D/g, ""));
    const readyDetails = [
        Boolean(name.trim()),
        phoneReady,
        Boolean(location),
        Boolean(image),
    ].filter(Boolean).length;

    return (
        <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="min-h-screen bg-[#f1f3f2] px-3 py-4 text-[#222926] sm:px-7 sm:py-7"
        >
            <div className="mx-auto max-w-7xl">
                <header className="mb-5 flex items-center justify-between rounded-lg border border-[#e1e5e2] bg-white px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5">
                        <img src="/Sushmap.jpg" alt="Sushmap logo" className="h-10 w-10 shrink-0 object-contain" />
                        <div>
                            <span className="block text-xl leading-5 font-semibold text-[#AF6028]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Sushmap</span>
                            <span className="hidden text-[10px] font-medium tracking-[0.12em] text-[#87908b] sm:block">MERCHANT CONSOLE</span>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] font-semibold tracking-[0.08em] ${createdBusiness ? "border-[#d4e8d8] bg-[#f2f8f3] text-[#36824b]" : "border-[#e2e7e3] bg-[#f8faf8] text-[#68716c]"}`}><span className={`h-1.5 w-1.5 rounded-full ${createdBusiness ? "bg-[#43a663]" : "bg-[#e23744]"}`} />{createdBusiness ? "LIVE ON SUSHMAP" : "SETUP IN PROGRESS"}</span>
                </header>

                <div className="grid overflow-hidden rounded-lg border border-[#e0e4e1] bg-white shadow-[0_18px_55px_-40px_rgba(25,35,30,0.32)] lg:min-h-172.5 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <motion.section
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.08 }}
                        className="flex flex-col border-b border-[#e6e9e6] bg-[#f8f9f8] px-5 py-6 sm:px-8 sm:py-8 lg:border-r lg:border-b-0 lg:px-7 lg:py-9"
                    >
                        {createdBusiness ? (
                            <div className="flex h-full flex-col">
                                <p className="text-[10px] font-bold tracking-[0.15em] text-[#36824b]">PUBLISH STATUS <span className="px-1 text-[#b7bfba]">/</span> COMPLETE</p>
                                <div className="mt-9">
                                    <span className="inline-flex items-center gap-2 rounded-md border border-[#d4e8d8] bg-white px-3 py-2 text-[10px] font-bold tracking-[0.1em] text-[#36824b]"><FiCheckCircle size={14} /> LISTING IS LIVE</span>
                                    <h1 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-[#202724]">You're live.</h1>
                                    <p className="mt-3 text-sm leading-6 text-[#737d77]">Your business is now published and ready to be discovered by people nearby.</p>
                                </div>
                                <div className="mt-8 rounded-lg border border-[#e1e5e2] bg-white p-4">
                                    <p className="text-[10px] font-bold tracking-[0.12em] text-[#87908b]">LIVE LISTING</p>
                                    <p className="mt-2 truncate text-base font-semibold text-[#252d28]">{createdBusiness.name}</p>
                                    <div className="mt-4 space-y-3 border-t border-[#edf0ed] pt-3">
                                        <p className="flex items-start gap-2.5 text-xs leading-5 text-[#737d77]"><FiMapPin className="mt-0.5 shrink-0 text-[#AF6028]" size={14} />{createdBusiness.autoLocation.formattedAddress}</p>
                                        <p className="flex items-center gap-2.5 text-xs text-[#737d77]"><FiPhone className="shrink-0 text-[#AF6028]" size={14} />{createdBusiness.phone}</p>
                                    </div>
                                </div>
                                <div className="mt-auto border-t border-[#e4e8e4] pt-5">
                                    <p className="text-[10px] font-bold tracking-[0.12em] text-[#87908b]">PUBLISHED TO</p>
                                    <p className="mt-1 text-sm font-semibold text-[#AF6028]">Sushmap <span className="font-normal text-[#737d77]">· Local discovery</span></p>
                                </div>
                            </div>
                        ) : (
                            <>
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.15em] text-[#e23744]">MERCHANT ONBOARDING <span className="px-1 text-[#b7bfba]">/</span> 01</p>
                            <h1 className="mt-4 text-[27px] leading-[1.12] font-semibold tracking-tight text-[#202724]">
                                Set up your business profile
                            </h1>
                            <p className="mt-3 text-[13px] leading-5 text-[#737d77]">
                                Add the essentials customers need to find and contact you.
                            </p>
                        </div>

                        <div className="mt-8">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-[10px] font-bold tracking-[0.13em] text-[#747d77]">PROFILE CHECKLIST</p>
                                <p className="font-mono text-[11px] font-semibold text-[#59635d]">{String(readyDetails).padStart(2, "0")} / 04</p>
                            </div>
                            <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#e4e8e4]">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${readyDetails * 25}%` }} transition={{ duration: 0.35 }} className="h-full rounded-full bg-[#e23744]" />
                            </div>
                            <div className="divide-y divide-[#e8ebe8] border-y border-[#e8ebe8]">
                                <div className="flex items-center gap-3 py-3">
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${name.trim() ? "bg-[#eaf4ec] text-[#32814a]" : "bg-white text-[#808983] ring-1 ring-[#e2e6e2]"}`}>{name.trim() ? <FiCheck size={14} /> : "01"}</span>
                                    <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#323a35]">Business name</p><p className="mt-0.5 text-[11px] text-[#87908a]">Your public listing title</p></div>
                                    <span className="text-[10px] font-medium text-[#89928c]">{name.trim() ? "READY" : "REQUIRED"}</span>
                                </div>
                                <div className="flex items-center gap-3 py-3">
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${phoneReady ? "bg-[#eaf4ec] text-[#32814a]" : "bg-white text-[#808983] ring-1 ring-[#e2e6e2]"}`}>{phoneReady ? <FiCheck size={14} /> : "02"}</span>
                                    <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#323a35]">Contact phone</p><p className="mt-0.5 text-[11px] text-[#87908a]">For customer enquiries</p></div>
                                    <span className="text-[10px] font-medium text-[#89928c]">{phoneReady ? "READY" : "REQUIRED"}</span>
                                </div>
                                <div className="flex items-center gap-3 py-3">
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${location ? "bg-[#eaf4ec] text-[#32814a]" : "bg-white text-[#808983] ring-1 ring-[#e2e6e2]"}`}>{location ? <FiCheck size={14} /> : "03"}</span>
                                    <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#323a35]">Location</p><p className="mt-0.5 truncate text-[11px] text-[#87908a]">{loadingLocation ? "Detecting your position" : location ? city : "Waiting for permission"}</p></div>
                                    <span className="text-[10px] font-medium text-[#89928c]">{location ? "READY" : "REQUIRED"}</span>
                                </div>
                                <div className="flex items-center gap-3 py-3">
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${image ? "bg-[#eaf4ec] text-[#32814a]" : "bg-white text-[#808983] ring-1 ring-[#e2e6e2]"}`}>{image ? <FiCheck size={14} /> : "04"}</span>
                                    <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#323a35]">Cover photo</p><p className="mt-0.5 text-[11px] text-[#87908a]">Help people recognize you</p></div>
                                    <span className="text-[10px] font-medium text-[#89928c]">{image ? "READY" : "REQUIRED"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-7">
                            <div className="flex items-start gap-3 rounded-md border border-[#e3e7e3] bg-white p-3.5">
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f8eeee] text-[#e23744]"><FiMapPin size={16} /></span>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2"><p className="text-[10px] font-bold tracking-[0.12em] text-[#747d77]">LOCATION SIGNAL</p>{location && <span className="h-1.5 w-1.5 rounded-full bg-[#43a663]" />}</div>
                                    <p className="mt-1 truncate text-xs font-medium text-[#343c37]">{loadingLocation ? "Acquiring GPS position" : location?.formattedAddress || city}</p>
                                    {location && <p className="mt-1 font-mono text-[10px] text-[#8a938d]">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>}
                                </div>
                            </div>
                        </div>
                            </>
                        )}
                    </motion.section>

                    <motion.section
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.12 }}
                        className="px-5 py-6 sm:px-8 sm:py-8 lg:px-11 lg:py-10"
                    >
                        <AnimatePresence mode="wait">
                            {createdBusiness ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="flex h-full flex-col justify-center py-2"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf5ec] text-[#33834a]"><FiCheck size={21} /></span>
                                        <span className="inline-flex items-center gap-2 rounded-md border border-[#d4e8d8] bg-[#f5faf5] px-3 py-2 text-[10px] font-bold tracking-[0.1em] text-[#36824b]"><span className="h-1.5 w-1.5 rounded-full bg-[#43a663]" /> LIVE ON SUSHMAP</span>
                                    </div>
                                    <div className="mt-6">
                                        <p className="text-[10px] font-bold tracking-[0.15em] text-[#AF6028]">PROFILE PUBLISHED</p>
                                        <h2 className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-[#222926] sm:text-4xl">You're live on <span className="text-[#AF6028]">Sushmap.</span></h2>
                                        <p className="mt-3 max-w-lg text-sm leading-6 text-[#707873]">Your business is now on the map. Here's how your listing is ready to appear to customers nearby.</p>
                                    </div>
                                    <div className="mt-7 overflow-hidden rounded-lg border border-[#e1e5e2] bg-white shadow-[0_12px_35px_-28px_rgba(25,35,30,0.5)] sm:flex">
                                        <img src={createdBusiness.image} alt={createdBusiness.name} className="h-48 w-full object-cover sm:h-auto sm:min-h-56 sm:w-52" />
                                        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-[#36824b]"><FiCheckCircle size={14} /> PUBLISHED LISTING</span>
                                                <span className="rounded-md bg-[#f3f5f3] px-2 py-1 font-mono text-[10px] text-[#858e88]">SUSHMAP / LOCAL</span>
                                            </div>
                                            <h3 className="mt-3 truncate text-xl font-semibold tracking-tight text-[#252d28]">{createdBusiness.name}</h3>
                                            {createdBusiness.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#737b76]">{createdBusiness.description}</p>}
                                            <div className="mt-4 space-y-3 border-t border-[#edf0ed] pt-4">
                                                <p className="flex items-start gap-2.5 text-sm leading-5 text-[#626b65]"><FiMapPin className="mt-0.5 shrink-0 text-[#AF6028]" size={16} />{createdBusiness.autoLocation.formattedAddress}</p>
                                                <p className="flex items-center gap-2.5 text-sm text-[#626b65]"><FiPhone className="shrink-0 text-[#AF6028]" size={15} />{createdBusiness.phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 flex items-start gap-2.5 border-t border-[#e8ebe8] pt-4 text-xs leading-5 text-[#747d77]"><FiCheckCircle className="mt-0.5 shrink-0 text-[#36824b]" size={15} />Your business details and location were saved to your merchant profile.</div>
                                </motion.div>
                            ) : (
                                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="mb-6 flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold tracking-[0.15em] text-[#e23744]">BUSINESS PROFILE</p>
                                            <h2 className="mt-2 text-[25px] leading-tight font-semibold tracking-tight text-[#222926]">Your business details</h2>
                                            <p className="mt-2 text-[13px] leading-5 text-[#737b76]">This information appears on your Sushmap listing.</p>
                                        </div>
                                        <span className="hidden shrink-0 rounded-md border border-[#e3e7e3] px-2.5 py-1.5 font-mono text-[10px] font-medium text-[#7e8781] sm:block">01 / 01</span>
                                    </div>

                                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="block">
                                                <span className="mb-2 block text-sm font-semibold">Business name <span className="text-[#e23744]">*</span></span>
                                                <span className="relative block">
                                                    <FiHome className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8b928d]" size={17} />
                                                    <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="organization" placeholder="e.g. The Daily Grind" className="h-12 w-full rounded-lg border border-[#dfe3dd] bg-white pr-3 pl-10 text-sm outline-none transition placeholder:text-[#a3aaa5] focus:border-[#e23744] focus:ring-3 focus:ring-[#e23744]/10" />
                                                </span>
                                            </label>

                                            <label className="block">
                                                <span className="mb-2 block text-sm font-semibold">Phone number <span className="text-[#e23744]">*</span></span>
                                                <span className="relative block">
                                                    <FiPhone className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8b928d]" size={16} />
                                                    <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="numeric" autoComplete="tel" placeholder="Your customer contact number" className="h-12 w-full rounded-lg border border-[#dfe3dd] bg-white pr-3 pl-10 text-sm outline-none transition placeholder:text-[#a3aaa5] focus:border-[#e23744] focus:ring-3 focus:ring-[#e23744]/10" />
                                                </span>
                                            </label>

                                            <label className="block sm:col-span-2">
                                                <span className="mb-2 flex items-center gap-2 text-sm font-semibold">About your business <span className="text-xs font-normal text-[#969e98]">Optional</span></span>
                                                <span className="relative block">
                                                    <FiFileText className="pointer-events-none absolute top-3.5 left-3.5 text-[#8b928d]" size={16} />
                                                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="What should people know about your place?" className="w-full resize-y rounded-lg border border-[#dfe3dd] bg-white py-3 pr-3 pl-10 text-sm leading-5 outline-none transition placeholder:text-[#a3aaa5] focus:border-[#e23744] focus:ring-3 focus:ring-[#e23744]/10" />
                                                </span>
                                            </label>
                                        </div>

                                        <div>
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="text-sm font-semibold">Business photo <span className="text-[#e23744]">*</span></span>
                                                <span className="text-xs text-[#969e98]">JPG, PNG · up to 5 MB</span>
                                            </div>
                                            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0])} />
                                            <div
                                                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                                                onDragOver={(event) => event.preventDefault()}
                                                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
                                                onDrop={handleDrop}
                                                className={`overflow-hidden rounded-lg border border-dashed transition ${dragging ? "border-[#e23744] bg-[#fff5f5]" : "border-[#d5dad4] bg-[#fafbf9]"}`}
                                            >
                                                {imagePreview ? (
                                                    <div className="flex min-h-28 items-center gap-4 p-3">
                                                        <img src={imagePreview} alt="Business photo preview" className="h-20 w-24 rounded-md object-cover" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-semibold">{image?.name}</p>
                                                            <p className="mt-1 text-xs text-[#858d87]">{((image?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB · ready to upload</p>
                                                        </div>
                                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 rounded-md border border-[#dfe3dd] bg-white px-3 py-2 text-xs font-semibold text-[#505953] transition hover:border-[#e23744] hover:text-[#e23744]">Change</button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-28 w-full items-center gap-4 px-4 py-4 text-left">
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f4e9e8] text-[#e23744]"><FiCamera size={19} /></span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-semibold">Choose a photo or drop it here</span>
                                                            <span className="mt-1 block text-xs text-[#858d87]">A clear photo helps people recognize your business.</span>
                                                        </span>
                                                        <FiImage className="hidden shrink-0 text-[#9ba29d] sm:block" size={19} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-[#e7e9e4] bg-[#fafbf9] p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#e23744] shadow-sm"><FiNavigation size={17} /></span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <p className="text-sm font-semibold">Business location</p>
                                                        {location && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#33834a]"><FiCheckCircle size={13} /> DETECTED</span>}
                                                    </div>
                                                    <p className="mt-1 text-sm leading-5 text-[#737b76]">{loadingLocation ? "Finding your location..." : location?.formattedAddress || (city === "Location unavailable" ? "Location access is unavailable." : "Allow location access to add your business.")}</p>
                                                </div>
                                                {!loadingLocation && !location && (
                                                    <button type="button" onClick={refreshLocation} title="Try location again" aria-label="Try location again" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e1e5df] bg-white text-[#626b65] transition hover:border-[#e23744] hover:text-[#e23744]"><FiRefreshCw size={15} /></button>
                                                )}
                                                {loadingLocation && <FiLoader className="mt-2 shrink-0 animate-spin text-[#e23744]" size={17} />}
                                            </div>
                                        </div>

                                        <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e23744] px-5 text-sm font-bold text-white transition hover:bg-[#c92e3a] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e23744] disabled:cursor-wait disabled:opacity-70">
                                            {submitting ? <><FiLoader className="animate-spin" size={17} /> Saving your business...</> : <>Add my business <FiArrowRight size={17} /></>}
                                        </button>
                                        <p className="text-center text-xs text-[#969e98]">By continuing, you confirm these business details are accurate.</p>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.section>
                </div>
            </div>
        </motion.main>
    );
}

export default AddBusiness