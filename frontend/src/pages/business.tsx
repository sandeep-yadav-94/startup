import { useEffect, useState } from "react";
import axios from "axios";
import { businessService } from "../config";
import AddBusiness from "../components/AddBusiness";
import BusinessProfile from "../components/BusinessProfile";
import ServiceList from "../components/ServiceList";
import AddServiceList from "../components/AddServiceList";
import type { IBusiness, IServiceList } from "../types";
import BusinessOrders from "../components/BusinessOrders";

type MerchantTab = "bookings" | "services" | "add-service"

const Business = () => {

  const [business, setBusiness] = useState<IBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<MerchantTab>("bookings");

  const fetchmyBusiness = async() => {
    try {
      const {data} = await axios.get(`${businessService}/api/business/my`, {
        headers:{
          Authorization:`Bearer ${localStorage.getItem("token")}`,
        }
      })
      console.log("Fetched business response:\n", JSON.stringify(data, null, 2));
      console.log("Business ID:", data.business?._id ?? "missing from response");
      setBusiness(data.business || null);
      if(data.token){
        localStorage.setItem("token", data.token);
        window.location.reload();
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return;
      }
      console.error("Failed to load your business:", error);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    void Promise.resolve().then(fetchmyBusiness);
  }, []);

  const [serviceList, setServiceList] = useState<IServiceList[]>([]);

  const fetchServiceList = async(businessId:string) =>{
    try {
      const {data} = await axios.get(`${businessService}/api/service/all/${businessId}`, {
        headers:{
          Authorization:`Bearer ${localStorage.getItem("token")}`,
        }
      })
      setServiceList(data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    if(business?._id){
      void Promise.resolve().then(() => fetchServiceList(business._id));
    }
  }, [business])

  if(loading){
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading your Business...</p></div>
  }
  if(!business){
    return <AddBusiness fetchmyBusiness={fetchmyBusiness}/>
  }

  const tabs: { key: MerchantTab; label: string; description: string }[] = [
    { key: "bookings", label: "Bookings & earnings", description: "Orders, sales and payout status" },
    { key: "services", label: "Your services", description: "Manage your listing" },
    { key: "add-service", label: "Add a service", description: "Grow your catalog" },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-[#f7f8f6] px-3 py-5 sm:px-5 sm:py-7">
      <BusinessProfile business={business} onUpdate={setBusiness} isMerchant={true} />

      <main className="mx-auto max-w-7xl">
        <div className="mb-5 overflow-hidden rounded-lg border border-[#e5e9e5] bg-white">
          <nav aria-label="Merchant workspace" className="flex overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                className={`min-w-40 flex-1 border-b-2 px-4 py-3.5 text-left transition sm:px-5 ${tab === item.key ? "border-[#af6028] bg-[#fbf8f5]" : "border-transparent hover:bg-[#fafbf9]"}`}
              >
                <span className={`block text-sm font-semibold ${tab === item.key ? "text-[#8f4e27]" : "text-[#59635c]"}`}>{item.label}</span>
                <span className="mt-0.5 hidden text-[11px] text-[#89928b] sm:block">{item.description}</span>
              </button>
            ))}
          </nav>
        </div>

        {tab === "bookings" && <BusinessOrders businessId={business._id} />}
        {tab === "services" && (
          <section className="rounded-lg border border-[#e5e9e5] bg-white p-4 sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#AF6028]">YOUR CATALOG</p>
              <h2 className="mt-1 text-xl font-semibold text-[#26312a]">Manage services</h2>
            </div>
            <ServiceList Service={serviceList} onServiceDeleted={() => fetchServiceList(business._id)} isMerchant={true} />
          </section>
        )}
        {tab === "add-service" && (
          <section className="rounded-lg border border-[#e5e9e5] bg-white p-4 sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#AF6028]">GROW YOUR CATALOG</p>
              <h2 className="mt-1 text-xl font-semibold text-[#26312a]">Add a service</h2>
            </div>
            <AddServiceList onServiceAdded={() => fetchServiceList(business._id)} />
          </section>
        )}
      </main>
    </div>
  );
};

export default Business;