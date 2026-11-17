import { Link, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { IBusiness, IServiceList } from "../types";
import { businessService } from "../config";
import { BUSINESS_CATEGORIES, getBusinessCategoryById, getBusinessCategoryByName } from "../config/businessCategories";
import axios from "axios";
import BusinessCard from "../components/BusinessCard";
import { FiArrowRight, FiCompass, FiMapPin, FiRefreshCw, FiSearch, FiShoppingBag } from "react-icons/fi";
import ServiceList from "../components/ServiceList";

interface SearchedService extends IServiceList {
  business: IBusiness & { distanceKm: number };
}

interface BusinessServiceGroup {
  business: SearchedService["business"];
  services: IServiceList[];
}

const getBusinessCategoryFromEntry = (business: IBusiness) => {
  const category = getBusinessCategoryById(business.categoryId) ?? getBusinessCategoryByName(business.categoryName);
  if (category) return category;

  const fallbackName = (business.categoryName || "Local Business").trim() || "Local Business";
  const normalizedName = fallbackName.toLowerCase();
  const matched = BUSINESS_CATEGORIES.find((entry) => {
    if (entry.name.toLowerCase() === normalizedName) return true;
    return entry.aliases.some((alias) => alias.toLowerCase() === normalizedName);
  });

  return matched ?? {
    id: `legacy-${fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "local-business"}`,
    name: fallbackName,
    group: "Local Business",
    icon: "🏪",
    aliases: [fallbackName],
  };
};

const Home = () => {
  const { location, city, loadingLocation, refreshLocation } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const [businesses, setBusinesses] = useState<IBusiness[]>([]);
  const [serviceResults, setServiceResults] = useState<SearchedService[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedSearch = search.trim();

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  const fetchBusinesses = useCallback(async () => {
    if (!location) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setServiceResults([]);
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${businessService}/api/business/all`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          search: normalizedSearch,
          categoryId: categoryId || undefined,
        },
        ...(token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {}),
      });
      setBusinesses(data.businesses ?? []);
    } catch (error) {
      console.log(error);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [location, normalizedSearch, categoryId, setLoading, setServiceResults, setBusinesses]);

  const fetchServiceResults = useCallback(async () => {
    if (!location) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setBusinesses([]);
      const { data } = await axios.get<{ results: SearchedService[] }>(`${businessService}/api/service/search`, {
        params: {
          q: normalizedSearch,
          latitude: location.latitude,
          longitude: location.longitude,
          categoryId: categoryId || undefined,
        },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setServiceResults(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error("Failed to search nearby services:", error);
      setServiceResults([]);
    } finally {
      setLoading(false);
    }
  }, [location, normalizedSearch, categoryId, setLoading, setBusinesses, setServiceResults]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (normalizedSearch) {
        void fetchServiceResults();
      } else {
        void fetchBusinesses();
      }
    });
    return () => {
      active = false;
    };
  }, [normalizedSearch, fetchBusinesses, fetchServiceResults]);

  const groupedBusinesses = useMemo(() => {
    const groups = new Map<string, IBusiness[]>();

    businesses.forEach((business) => {
      const category = getBusinessCategoryFromEntry(business);
      if (!groups.has(category.id)) {
        groups.set(category.id, []);
      }
      groups.get(category.id)?.push(business);
    });

    return Array.from(groups.entries())
      .map(([id, row]) => {
        const category = getBusinessCategoryFromEntry(row[0]);
        return {
          id,
          category,
          businesses: row,
        };
      })
      .sort((left, right) => {
        const leftOrder = BUSINESS_CATEGORIES.findIndex((item) => item.id === left.category.id);
        const rightOrder = BUSINESS_CATEGORIES.findIndex((item) => item.id === right.category.id);
        return (leftOrder === -1 ? 999 : leftOrder) - (rightOrder === -1 ? 999 : rightOrder);
      });
  }, [businesses]);

  const groupedServiceResults = useMemo(() => {
    const groups = new Map<string, BusinessServiceGroup>();

    serviceResults.forEach((result) => {
      const existing = groups.get(result.business._id);
      if (existing) {
        existing.services.push(result);
      } else {
        groups.set(result.business._id, {
          business: result.business,
          services: [result],
        });
      }
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.business.isOpen !== right.business.isOpen) {
        return left.business.isOpen ? -1 : 1;
      }
      return left.business.distanceKm - right.business.distanceKm;
    });
  }, [serviceResults]);

  if (loading && !location) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center bg-[#faf9f6]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#eee9df] bg-white px-6 py-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1e5] text-[#bd6530]"><FiCompass className="animate-pulse" size={19} /></span>
          <div>
            <p className="text-sm font-semibold text-[#302d29]">Finding your place</p>
            <p className="mt-0.5 text-xs text-[#8a857c]">Checking businesses around you</p>
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#faf9f6] px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-[#eee8dd] bg-white p-8 text-center shadow-[0_20px_70px_-45px_rgba(74,54,30,0.28)] sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff2e6] text-[#bd6530]"><FiMapPin size={27} /></span>
          <p className="mt-6 text-[11px] font-bold tracking-[0.18em] text-[#bd6530]">YOUR NEIGHBOURHOOD, FIRST</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#282723]">Let’s find your local spots</h1>
          <p className="mt-3 text-sm leading-6 text-[#77746d]">
          {city === "Location permission needed"
            ? "Please allow location access to find businesses near you."
            : "Your location is unavailable. Please enable location services and try again."}
          </p>
          <button
            type="button"
            onClick={() => void refreshLocation()}
            disabled={loadingLocation}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b95035] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(185,80,53,0.8)] transition hover:-translate-y-0.5 hover:bg-[#a6432d] disabled:cursor-wait disabled:opacity-60"
          >
            <FiRefreshCw className={loadingLocation ? "animate-spin" : ""} size={15} />
            {loadingLocation ? "Finding your location..." : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#282723]">
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <section className="border-b border-[#e9e4da] pb-6 sm:pb-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#78736a]">
                <FiMapPin className="text-[#a75237]" size={14} />
                <span>{city || "Near you"}</span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#282723] sm:text-4xl">
                {normalizedSearch ? (
                  <>Results for <span className="font-[Fraunces] font-medium italic text-[#a75237]">“{normalizedSearch}”</span></>
                ) : (
                  <>Find something <span className="font-[Fraunces] font-medium italic text-[#a75237]">nearby.</span></>
                )}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#77736a] sm:text-base">
                {normalizedSearch
                  ? "Matching services and businesses near you."
                  : "Explore trusted local businesses around your neighbourhood."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f0ede6] px-3.5 py-2 text-sm text-[#625e55]">
              <FiShoppingBag className="text-[#a75237]" size={15} />
              {normalizedSearch
                ? `${serviceResults.length} ${serviceResults.length === 1 ? "service" : "services"} found`
                : `${businesses.length} ${businesses.length === 1 ? "business nearby" : "businesses nearby"}`}
            </div>
          </div>
        </section>

        {!normalizedSearch && groupedBusinesses.length > 0 && (
          <nav aria-label="Nearby business categories" className="mt-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groupedBusinesses.map(({ category, businesses: sectionBusinesses }) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  document.getElementById(`category-${category.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e9e4da] bg-white px-4 py-2.5 text-sm font-medium text-[#514d45] shadow-sm transition hover:border-[#d8a476] hover:text-[#a75237]"
              >
                <span>{category.icon}</span>
                {category.name}
                <span className="rounded-full bg-[#f4f1eb] px-2 py-0.5 text-[10px] text-[#777166]">{sectionBusinesses.length}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="mt-9">
          {loading ? (
            normalizedSearch ? (
              <div className="space-y-4" aria-label="Searching services">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-36 animate-pulse rounded-3xl border border-[#eee9e0] bg-white" />
                ))}
              </div>
            ) : (
              <div className="space-y-9" aria-label="Loading nearby businesses">
                {[0, 1].map((row) => (
                  <section key={row}>
                    <div className="mb-4 h-6 w-52 animate-pulse rounded-lg bg-[#eae6de]" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {[0, 1, 2, 3, 4].map((card) => (
                        <div key={card} className="overflow-hidden rounded-2xl border border-[#eee9e0] bg-white">
                          <div className="aspect-[1.4] animate-pulse bg-[#eeeae2]" />
                          <div className="space-y-2 p-3">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-[#eeeae2]" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-[#f2efe9]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : normalizedSearch && groupedServiceResults.length > 0 ? (
            <div className="space-y-7">
              {groupedServiceResults.map(({ business: matchedBusiness, services: matchedServices }) => (
                <section key={matchedBusiness._id} className="overflow-hidden rounded-3xl border border-[#ece7de] bg-white shadow-[0_8px_28px_-24px_rgba(49,43,34,0.42)]">
                  <Link
                    to={`/business/${matchedBusiness._id}`}
                    className="flex items-center gap-4 border-b border-[#f0ede7] p-4 transition hover:bg-[#fcfbf8] sm:p-5"
                  >
                    <img
                      src={matchedBusiness.image}
                      alt=""
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                      className="h-16 w-16 shrink-0 rounded-2xl bg-[#f1eee8] object-cover sm:h-20 sm:w-20"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-bold text-[#30352f] sm:text-xl">{matchedBusiness.name}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${matchedBusiness.isOpen ? "bg-[#edf6eb] text-[#347447]" : "bg-[#f1f0ed] text-[#73766f]"}`}>
                          {matchedBusiness.isOpen ? "Open now" : "Closed"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-[#767c75]">
                        {matchedBusiness.categoryName || "Local business"}
                        {matchedBusiness.autoLocation.formattedAddress ? ` · ${matchedBusiness.autoLocation.formattedAddress}` : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#a75237]">
                        {matchedBusiness.distanceKm.toFixed(2)} km away · {matchedServices.length} matching {matchedServices.length === 1 ? "service" : "services"}
                      </p>
                    </div>
                    <FiArrowRight className="hidden shrink-0 text-[#9b806b] sm:block" size={18} />
                  </Link>
                  <div className="p-3 sm:p-4">
                    <ServiceList
                      Service={matchedServices}
                      onServiceDeleted={() => { void fetchServiceResults(); }}
                      isMerchant={false}
                    />
                  </div>
                </section>
              ))}
            </div>
          ) : normalizedSearch ? (
            <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-dashed border-[#ddd6ca] bg-white/70 px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eee5] text-[#9b7959]"><FiSearch size={24} /></span>
              <p className="mt-5 text-lg font-semibold text-[#34312b]">No matching services found</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#77736a]">Try another keyword or search for a nearby business or service.</p>
            </div>
          ) : groupedBusinesses.length > 0 ? (
            <div className="space-y-10">
              {groupedBusinesses.map(({ category, businesses: sectionBusinesses }) => (
                <section id={`category-${category.id}`} key={category.id} className="scroll-mt-6">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eee7dc] bg-white text-xl shadow-sm">{category.icon}</span>
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.16em] text-[#a27857]">A LITTLE CLOSER</p>
                        <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-[#2e2c27] sm:text-xl">Nearby {category.name}</h2>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchParams((current) => {
                          const next = new URLSearchParams(current);
                          next.set("categoryId", category.id);
                          return next;
                        });
                      }}
                      className="group inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-[#a75237] transition hover:bg-[#f5ebe4]"
                    >
                      See all <FiArrowRight className="transition group-hover:translate-x-0.5" size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {sectionBusinesses.map((bus) => {
                      const [busLng, busLat] = bus.autoLocation.coordinates;
                      const distance = getDistanceKm(location.latitude, location.longitude, busLat, busLng);
                      return (
                        <div key={bus._id} className="overflow-hidden rounded-2xl border border-[#ece7de] bg-white shadow-[0_5px_20px_-16px_rgba(49,43,34,0.4)] transition duration-200 hover:-translate-y-1 hover:border-[#dfd5c7] hover:shadow-[0_18px_32px_-22px_rgba(49,43,34,0.4)]">
                          <BusinessCard
                            id={bus._id}
                            name={bus.name}
                            image={bus.image ?? ""}
                            distance={`${distance}`}
                            isOpen={bus.isOpen}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-dashed border-[#ddd6ca] bg-white/70 px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eee5] text-[#9b7959]"><FiSearch size={24} /></span>
              <p className="mt-5 text-lg font-semibold text-[#34312b]">No local spots found just yet</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#77736a]">There aren't any listed businesses around this location right now. Try again later as new neighbourhoods join SanX.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Home;
