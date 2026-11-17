import type { IServiceList } from "../types";
import { useState } from "react";
import { BsCart, BsEye } from "react-icons/bs";
import { FiEyeOff } from "react-icons/fi";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { businessService } from "../config";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";

interface ServiceListProps {
  Service :IServiceList[];
  onServiceDeleted: ()=>void;
  isMerchant : boolean;
}

const ServiceList = ({Service, onServiceDeleted, isMerchant}:ServiceListProps) => {
  const [loadingServiceId, setLoadingServiceId] = useState<string | null>(null);

  const handleDelete = async(serviceId:string)=>{
    const confirm = window.confirm("Sach me delete krdu bhai...");
    if(!confirm) return;
    setLoadingServiceId(serviceId);
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
    } finally {
      setLoadingServiceId(null);
    }
  }

  const toggleAvailibility = async(serviceId:string)=>{
    setLoadingServiceId(serviceId);
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
    } finally {
      setLoadingServiceId(null);
    }

  }


  const {fetchCart} = useAppData()

  const addToCart = async(businessId:string, serviceId:string)=>{
    try {
      setLoadingServiceId(serviceId);
      const {data} = await axios.post(`${businessService}/api/cart/add`, {
        businessId, serviceId
      }, {
        headers:{
          Authorization:`Bearer ${localStorage.getItem("token")}`
        }
      })
      toast.success(data.message);
      fetchCart();
    } catch (error:any) {
      toast.error(error.response?.data?.message || "Unable to add to cart");
    }finally{
      setLoadingServiceId(null);
    }
  }


  return (
    <div className={isMerchant ? "grid grid-cols-1 gap-4 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4" : "grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4"}>
      {
        Service.map((item)=>{
          const isLoading = loadingServiceId === item._id;
          if (isMerchant) {
            return (
              <div className={`relative flex gap-4 rounded-lg bg-white p-4 shadow-sm transition ${!item.isAvailable ? "opacity-70" : ""}`} key={item._id}>
                <div className="relative shrink-0">
                  <img src={item.image} alt="" className={`h-20 w-20 rounded object-cover ${!item.isAvailable ? "grayscale brightness-75" : ""}`} />
                  {!item.isAvailable && <span className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-xs font-semibold text-white">Not available</span>}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.description && <p className="line-clamp-2 text-sm text-gray-500">{item.description}</p>}
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-medium">₹{item.price}</p>
                  <div className="flex gap-2">
                    <button onClick={()=>toggleAvailibility(item._id)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">{item.isAvailable ? <BsEye size={18}/> : <FiEyeOff size={18}/>}</button>
                    <button onClick={()=>handleDelete(item._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><BiTrash size={18}/></button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <article key={item._id} className={`flex min-h-40 gap-4 rounded-3xl border border-[#eee9e2] bg-white p-3.5 shadow-[0_8px_28px_-24px_rgba(47,39,29,0.42)] transition hover:border-[#e3d8cb] hover:shadow-[0_16px_34px_-25px_rgba(47,39,29,0.35)] sm:gap-5 sm:p-4 ${!item.isAvailable ? "opacity-75" : ""}`}>
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#f1eee8] sm:h-32 sm:w-32">
                <img
                  src={item.image}
                  alt={item.name}
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                  className={`h-full w-full object-cover ${!item.isAvailable ? "grayscale" : ""}`}
                />
                {!item.isAvailable && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 px-2 text-center text-xs font-bold text-white">
                    Currently unavailable
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 text-base font-bold leading-6 text-[#30352f] sm:text-lg">{item.name}</h3>
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border ${item.isAvailable ? "border-[#34834a] bg-[#43a85d]" : "border-[#9a9d97] bg-[#b8bbb5]"}`} aria-label={item.isAvailable ? "Available" : "Unavailable"} />
                  </div>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#777d76]">{item.description}</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-bold text-[#30352f]">₹{Number(item.price).toLocaleString("en-IN")}</p>
                  <button
                    type="button"
                    disabled={!item.isAvailable || isLoading}
                    onClick={() => addToCart(item.businessId, item._id)}
                    className={`inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold shadow-sm transition ${!item.isAvailable || isLoading ? "cursor-not-allowed border-[#e6e5e1] bg-[#f4f4f1] text-[#9a9e97]" : "border-[#d9e8d8] bg-[#f1f8ef] text-[#367447] hover:border-[#a9cba7] hover:bg-[#e8f4e5]"}`}
                  >
                    {isLoading ? <VscLoading size={16} className="animate-spin" /> : <BsCart size={16} />}
                    {isLoading ? "Adding" : item.isAvailable ? "Add" : "Sold out"}
                  </button>
                </div>
              </div>
            </article>
          );
        })
      }
    </div>
  )
}

export default ServiceList