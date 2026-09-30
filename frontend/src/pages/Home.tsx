import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IBusiness } from "../types";
import { businessService } from "../config";
import axios from "axios";
import BusinessCard from "../components/BusinessCard";


const Home = () => {

  const {location} = useAppData();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || ""
  const [businesses, setBusinesses] = useState<IBusiness[]>([])
  const [loading, setLoading] = useState(true)

  const getDistanceKm = (lat1:number, lon1:number, lat2:number, lon2:number):number=>{
    const R = 6371;
    const dLat = ((lat2-lat1)*Math.PI)/180;
    const dLon = ((lon2-lon1)*Math.PI)/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos((lat1 * Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return +(R*c).toFixed(2);
  }


  const fetchBusinesses = async()=>{
    if(!location?.latitude || !location?.longitude){
      // alert("You need to give your location permission to continue");
    }
    try {
      setLoading(true);
      const {data} = await axios.get(`${businessService}/api/business/all`, {params:{
        latitude:location?.latitude,
        longitude:location?.longitude,
        search,
      },
      headers:{
        Authorization:`Bearer ${localStorage.getItem("token")}`
      }
    })
    setBusinesses(data.businesses?? []);
    } catch (error) {
      console.log(error)
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    fetchBusinesses()
  }, [location, search]);

  if(loading && !location){
    return <div className="flex h-[60vh] items-center justify-center">
      <p className="text-gray-500">Finding Businesses near you</p>
    </div>
  }


  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {
        businesses.length > 0 ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {
            businesses.map((bus)=>{
              const [busLng, busLat] = bus.autoLocation.coordinates;
              if (!location) return null;
              const distance = getDistanceKm(
                location.latitude,
                location.longitude,
                busLat,
                busLng
              ) 
              return <BusinessCard key={bus._id} id={bus._id} name={bus.name} image={bus.image ?? ""} distance={`${distance}`} isOpen={bus.isOpen} />
            })
          }
        </div>:<p className="text-center text-gray-500">No Business Found</p>
      }
    </div>
  )

}

export default Home