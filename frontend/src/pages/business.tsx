import { useEffect, useState } from "react";
import type { IBusiness } from "../types";
import axios from "axios";
import { businessService } from "../config";
import AddBusiness from "../components/AddBusiness";
import BusinessProfile from "../components/BusinessProfile";

const business = () => {
  const [business, setBusiness] = useState<IBusiness | null>(null);
  const [loading, setLoading] = useState(true);
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

  if(loading){
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading your Business...</p></div>
  }
  if(!business){
    return <AddBusiness fetchmyBusiness={fetchmyBusiness}/>
  }

  return <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6"><BusinessProfile business={business}onUpdate={setBusiness} isMerchant={true}/></div>;
};

export default business;