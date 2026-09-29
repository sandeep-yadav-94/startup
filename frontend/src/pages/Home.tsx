import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext"
import { useEffect, useState } from "react";
import type { IBusiness } from "../types";
import { businessService } from "../config";
import axios from "axios";
import { div } from "framer-motion/client";


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
    <div>Home</div>
  )

}

export default Home