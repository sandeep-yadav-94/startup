import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiMapPin, FiPhone, FiShoppingBag } from "react-icons/fi";
import ServiceList from "../components/ServiceList";
import { businessService } from "../config";
import type { IBusiness, IServiceList } from "../types";

const BusinessDetails = () => {
  const { id } = useParams();
  const [business, setBusiness] = useState<IBusiness | null>(null);
  const [services, setServices] = useState<IServiceList[]>([]);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchServices = async (businessId: string) => {
    setServicesLoading(true);
    try {
      const { data } = await axios.get<IServiceList[]>(`${businessService}/api/service/all/${businessId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setServices(data || []);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        setError("Business not found");
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get<IBusiness | null>(`${businessService}/api/business/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!data) {
          setError("Business not found");
          return;
        }
        setBusiness(data);
        await fetchServices(data._id);
      } catch {
        setError("Unable to load this business");
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-4 py-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-64 rounded-3xl bg-[#eeece8] sm:h-80" />
          <div className="mt-6 h-8 w-64 rounded-lg bg-[#eeece8]" />
          <div className="mt-3 h-4 w-96 max-w-full rounded-lg bg-[#eeece8]" />
          <div className="mt-10 h-7 w-48 rounded-lg bg-[#eeece8]" />
          <div className="mt-5 space-y-3">
            <div className="h-32 rounded-2xl bg-[#eeece8]" />
            <div className="h-32 rounded-2xl bg-[#eeece8]" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !business) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf9f7] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#eee9e2] bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1ed] text-[#d94d3d]">
            <FiShoppingBag size={24} />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-[#292c29]">{error || "Business not found"}</h1>
          <p className="mt-2 text-sm leading-6 text-[#777d77]">This page may have moved or is temporarily unavailable.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#df4b3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c93e30]">
            <FiArrowLeft size={16} /> Back to businesses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] pb-14">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-7">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eae5dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#4c514c] shadow-sm transition hover:border-[#df4b3b]/30 hover:text-[#cf4435]">
          <FiArrowLeft size={16} /> Back
        </Link>

        <section className="overflow-hidden rounded-[1.75rem] border border-[#eee9e2] bg-white shadow-[0_16px_50px_-40px_rgba(54,44,33,0.35)]">
          <div className="relative h-56 overflow-hidden bg-[#eee9e2] sm:h-72 lg:h-88">
            {business.image && !imageFailed ? (
              <img
                src={business.image}
                alt={business.name}
                onError={() => setImageFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#efe9dc] via-[#f6f1e8] to-[#e6e9df] text-sm font-medium text-[#817b6e]">
                Business photo unavailable
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 text-white sm:p-8">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${business.isOpen ? "bg-[#e9f5e9] text-[#327245]" : "bg-white/90 text-[#626660]"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${business.isOpen ? "bg-[#3a9854]" : "bg-[#949991]"}`} />
                    {business.isOpen ? "Open now" : "Currently closed"}
                  </span>
                  {business.categoryName && (
                    <span className="rounded-full border border-white/35 bg-black/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                      {business.categoryName}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h1>
              </div>
              <span className="hidden shrink-0 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur-md sm:inline-flex sm:items-center sm:gap-2">
                <FiShoppingBag size={17} /> Local business
              </span>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8 sm:py-6">
            <div className="min-w-0">
              {business.autoLocation.formattedAddress && (
                <p className="flex items-start gap-2.5 text-sm leading-6 text-[#626a63]">
                  <FiMapPin className="mt-1 shrink-0 text-[#d94d3d]" size={17} />
                  <span>{business.autoLocation.formattedAddress}</span>
                </p>
              )}
              {business.description && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#777d77]">{business.description}</p>
              )}
            </div>
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#eee2dc] bg-[#fff8f5] px-5 text-sm font-semibold text-[#bf4939] transition hover:bg-[#fff0e9]"
              >
                <FiPhone size={16} /> Call business
              </a>
            )}
          </div>
        </section>

        <section className="mt-9 sm:mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b07152]">Made nearby, picked for you</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#292c29] sm:text-3xl">Explore services</h2>
            </div>
            <span className="rounded-full border border-[#eee9e2] bg-white px-3.5 py-2 text-sm font-medium text-[#687069]">
              {services.length} {services.length === 1 ? "item" : "items"}
            </span>
          </div>

          {servicesLoading ? (
            <div className="space-y-3" aria-label="Loading services">
              <div className="h-36 animate-pulse rounded-2xl bg-[#eeece8]" />
              <div className="h-36 animate-pulse rounded-2xl bg-[#eeece8]" />
            </div>
          ) : services.length > 0 ? (
            <ServiceList Service={services} onServiceDeleted={() => fetchServices(business._id)} isMerchant={false} />
          ) : (
            <div className="rounded-3xl border border-dashed border-[#ddd7ce] bg-white px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7f1e8] text-[#a8784f]">
                <FiShoppingBag size={23} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[#343832]">Nothing listed just yet</h3>
              <p className="mt-1 text-sm text-[#7b817a]">Please check back soon for services from this business.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default BusinessDetails;
