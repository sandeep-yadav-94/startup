import { useState } from "react";
import { useNavigate } from "react-router-dom";

type props = {
    id:string;
    image:string;
    name:string;
    distance:string;
    isOpen:boolean;
}



const BusinessCard = ({id, image, name, distance, isOpen}:props) => {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
    const hasValidId = /^[0-9a-fA-F]{24}$/.test(id);

  return (
    <div className={`${hasValidId ? "cursor-pointer" : "cursor-not-allowed"} overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${!isOpen ? "opacity-80" : ""}`} onClick={()=>hasValidId && navigate(`/business/${id}`)}>
        <div className="relative h-40 w-full overflow-hidden">
      {image && !imageFailed ? (
        <img src={image} alt={name} onError={() => setImageFailed(true)} className={`h-full w-full object-cover transition duration-300 hover:scale-105 ${!isOpen ? "grayscale" : ""}`} />
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-500">Image unavailable</div>
      )}
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900">{name}</h2>
            <p className="mt-1 text-xs text-gray-500">{distance} km away</p>
          </div>
          <span className="shrink-0 text-xs text-gray-600">{isOpen ? "Open" : "Closed"}</span>
        </div>
    </div>
  )
}

export default BusinessCard