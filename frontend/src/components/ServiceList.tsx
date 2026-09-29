import { div, span } from "framer-motion/client";
import type { IServiceList } from "../types"
import { useState } from "react";
import { BsCart, BsEye } from "react-icons/bs";
import { FiEyeOff } from "react-icons/fi";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { businessService } from "../config";
import toast from "react-hot-toast";

interface ServiceListProps {
  Service :IServiceList[];
  onServiceDeleted: ()=>void;
  isMerchant : boolean;
}

const ServiceList = ({Service, onServiceDeleted, isMerchant}:ServiceListProps) => {
  const [loadingServiceId, setLoadingServiceId] = useState<string |null>(null)
  const handleDelete = async(serviceId:string)=>{
    const confirm = window.confirm("Sach me delete krdu bhai...");
    if(!confirm) return;
    try {
      await axios.delete(`${businessService}/api/service/${serviceId}`, {
        headers:{
          Authorization:`Bearer ${localStorage.getItem("token")}`,
        }
      })
      toast.success("Item deleted");
      onServiceDeleted();
    } catch (error) {
      console.log(error);
      toast.error("failed to delete this item");
    }
  }

  const toggleAvailibility = async(serviceId:string)=>{
   
    try {
      const {data} = await axios.put(`${businessService}/api/service/status/${serviceId}`, {}, {
        headers:{
          Authorization:`Bearer ${localStorage.getItem("token")}`,
        }
      })
      toast.success(data.message);
      onServiceDeleted();
    } catch (error) {
      console.log(error);
      toast.error("failed to update status");
    }

  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4">
      {
        Service.map((item)=>{
          const isLoading = loadingServiceId === item._id;
          return <div className={`relative flex gap-4 rounded-lg bg-white p-4 shadow-sm transition ${!item.isAvailable ? "opacity-70" : ""}`}>
            <div className="relative shrink-0">
              <img src={item.image} alt="" className={`h-20 w-20 rounded object-cover ${!item.isAvailable ? "grayscale brightness-75" : ""}`} />
              {
                !item.isAvailable && <span className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-xs font-semibold text-white">Not available</span> 
              }
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <h3 className="font-semibold">{item.name}</h3>
              {
                item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                )
              }
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium">₹{item.price}</p>
              {
                isMerchant && <div className="flex gap-2">
                  <button onClick={()=>toggleAvailibility(item._id)}  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">{item.isAvailable ? <BsEye size={18}/> : <FiEyeOff size={18}/>}</button>
                  <button onClick={()=>handleDelete(item._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><BiTrash size={18}/></button>
                </div>
              }
              {
                !isMerchant && <button disabled={!item.isAvailable || isLoading} onClick={()=>{}} className={`flex items-center justify-center rounded-lg p-2 ${!item.isAvailable || isLoading ? "cursor-not-allowed text-gray-400" : "text-red-500 hover:bg-red-50"}`}>
                  {isLoading ? <VscLoading size={18} className="animate-spin"/> : <BsCart size={18}/>}
                </button>
              }
            </div>
          </div>
        })
      }
    </div>
  )
}

export default ServiceList