import { useEffect, useState } from "react";
import axios from "axios";
import { businessService } from "../config";
import AddBusiness from "../components/AddBusiness";
import BusinessProfile from "../components/BusinessProfile";
import ServiceList from "../components/ServiceList";
import AddServiceList from "../components/AddServiceList";
import type { IBusiness, IServiceList } from "../types";

type MerchantTab = "services" | "add-service" | "bookings"

const business = () => {

  const [business, setBusiness] = useState<IBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<MerchantTab>("services");

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
    fetchmyBusiness();
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
      fetchServiceList(business._id)
    }
  }, [business])

  if(loading){
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading your Business...</p></div>
  }
  if(!business){
    return <AddBusiness fetchmyBusiness={fetchmyBusiness}/>
  }

  return <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6"><BusinessProfile business={business}onUpdate={setBusiness} isMerchant={true}/>
  <div className="rounded-xl bg-white shadow-sm">
    <div className="flex border-b">
      {
        [
          {key:"services", label:"Services-list"},
          {key:"add-service", label:"Add service"},
          {key:"bookings", label:"Bookings"}
        ].map((t)=>(
          <button key={t.key} onClick={()=>setTab(t.key as MerchantTab)} className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === t.key ? "border-b-2 border-red-500 text-red-500 " : "text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))
      }
    </div>

    <div className="p-5">
      {
        tab === "services" && <ServiceList Service={serviceList} onServiceDeleted={()=>fetchServiceList(business._id)} isMerchant={true}/>
      }
      {
        tab === "add-service" && <AddServiceList onServiceAdded={()=>fetchServiceList(business._id)}/>
      }
      {
        tab === "bookings" && <p>Bookings Page</p>
      }
    </div>

  </div>
  </div>;
};

export default business;