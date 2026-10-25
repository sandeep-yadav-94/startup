
import {
MapContainer,
TileLayer,
Marker,
useMapEvents,
useMap,
} from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { businessService } from "../config";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash } from "react-icons/bi";
// 🔧 Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
iconRetinaUrl:
"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

});
interface Address {
_id: string;
formattedAddress: string;
mobile: number;
}

interface ReverseGeocodeResult {
display_name?: string;
name?: string;
address?: Record<string, string | undefined>;
}

const formatReverseGeocodeAddress = (result: ReverseGeocodeResult) => {
const address = result.address || {};
const parts = [
result.name,
address.house_number,
address.road || address.pedestrian || address.footway || address.residential,
address.neighbourhood || address.quarter || address.suburb,
address.city || address.town || address.village || address.municipality,
address.state_district || address.county,
address.state,
address.postcode,
].filter((part): part is string => Boolean(part?.trim()));
const uniqueParts = parts.filter(
(part, index) => parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index,
);

return uniqueParts.join(", ") || result.display_name || "";
};

// 📍 Click-to-select location
const LocationPicker = ({
setLocation,
}: {
setLocation: (lat: number, lng: number) => void;
}) => {
useMapEvents({
click(e) {
setLocation(e.latlng.lat, e.latlng.lng);
},

});
return null;
};
// 🎯 Locate me button
const LocateMeButton = ({
onLocate,
}: {
onLocate: (lat: number, lng: number) => void;
}) => {
const map = useMap();
const locateUser = () => {
if (!navigator.geolocation) {
toast.error("Geolocation not supported");
return;
}
navigator.geolocation.getCurrentPosition(
(pos) => {
const { latitude, longitude } = pos.coords;
map.flyTo([latitude, longitude], 16, { animate: true });
onLocate(latitude, longitude);
},
() => toast.error("Location permission denied")
);
};
return (
<button
onClick={locateUser}
className="absolute right-3 top-3 z-1000 flex items-center gap-2
rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
>
<LuLocateFixed size={16} />
Use current location
</button>
);
};
const AddAddressPage = () => {
const [addresses, setAddresses] = useState<Address[]>([]);

const [loading, setLoading] = useState(true);
const [adding, setAdding] = useState(false);
const [deletingId, setDeletingId] = useState<string | null>(null);
// 📋 Form state
const [mobile, setMobile] = useState("");
const [formattedAddress, setFormattedAddress] = useState("");
const [addressDetails, setAddressDetails] = useState("");
const [isFetchingAddress, setIsFetchingAddress] = useState(false);
const [latitude, setLatitude] = useState<number | null>(null);
const [longitude, setLongitude] = useState<number | null>(null);
const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const reverseGeocodeRequest = useRef(0);
// 🌍 Reverse geocoding
const fetchFormattedAddress = async (lat: number, lng: number, requestId: number) => {
try {
const { data } = await axios.get<ReverseGeocodeResult>(`${businessService}/api/address/reverse`, {
params: { lat, lng },
});
if (requestId === reverseGeocodeRequest.current) {
setFormattedAddress(formatReverseGeocodeAddress(data));
}
} catch {
if (requestId === reverseGeocodeRequest.current) {
toast.error("Failed to fetch address");
}
} finally {
if (requestId === reverseGeocodeRequest.current) {
setIsFetchingAddress(false);
}
}
};
const setLocation = (lat: number, lng: number) => {
setLatitude(lat);
setLongitude(lng);
setFormattedAddress("");
setIsFetchingAddress(true);
const requestId = ++reverseGeocodeRequest.current;
if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
reverseGeocodeTimer.current = setTimeout(() => fetchFormattedAddress(lat, lng, requestId), 700);
};
// 📡 Fetch addresses
const fetchAddresses = async () => {
try {
const { data } = await
axios.get(`${businessService}/api/address/all`, {
headers: {
Authorization: `Bearer ${localStorage.getItem("token")}`,
},
});
	setAddresses(Array.isArray(data?.addresses) ? data.addresses : []);
} catch {
toast.error("Failed to load addresses");

} finally {
setLoading(false);
}
};
useEffect(() => {
fetchAddresses();
}, []);
useEffect(() => () => {
if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
reverseGeocodeRequest.current += 1;
}, []);
// ➕ Add address
const addAddress = async () => {
const savedAddress = [addressDetails.trim(), formattedAddress].filter(Boolean).join(", ");
if (
!mobile ||
!addressDetails.trim() ||
!savedAddress ||
isFetchingAddress ||
latitude === null ||
longitude === null
) {
toast.error("Add your flat, house, street, or a nearby landmark for accurate delivery");
return;
}
try {
setAdding(true);
await axios.post(
`${businessService}/api/address/new`,
{
formattedAddress: savedAddress,
mobile,
latitude,
longitude,
},
{
headers: {
Authorization: `Bearer ${localStorage.getItem("token")}`,
},
}
);
toast.success("Address added");
setMobile("");
setFormattedAddress("");
setAddressDetails("");

setLatitude(null);
setLongitude(null);
fetchAddresses();
} catch (error: any) {
toast.error(error.response?.data?.message || "Failed");
} finally {
setAdding(false);
}
};
// 🗑 Delete address
const deleteAddress = async (id: string) => {
if (!window.confirm("Delete this address?")) return;
try {
setDeletingId(id);
await axios.delete(`${businessService}/api/address/${id}`, {
headers: {
Authorization: `Bearer ${localStorage.getItem("token")}`,
},
});
toast.success("Address deleted");
fetchAddresses();
} catch {
toast.error("Failed to delete address");
} finally {
setDeletingId(null);
}
};
return (
<div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
<h1 className="text-2xl font-bold">Select your Address</h1>
{/* 🗺 Map */}
<div className="relative h-100 w-full overflow-hidden rounded-lg
border">
<MapContainer
center={[latitude || 28.3670, longitude || 79.4304]}
zoom={13}

className="h-full w-full"
style={{ height: "100%", width: "100%" }}
>
<TileLayer
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
attribution='&copy; <a
href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
/>
<LocationPicker setLocation={setLocation} />
<LocateMeButton onLocate={setLocation} />
{latitude && longitude && <Marker position={[latitude,
longitude]} />}
</MapContainer>
</div>
{/* 📍 Selected address */}
{formattedAddress && (
<div className="rounded-lg border bg-green-50 p-3 text-sm">
📍 {[addressDetails.trim(), formattedAddress].filter(Boolean).join(", ")}
</div>
)}
{isFetchingAddress && (
<p className="text-sm text-gray-500">Finding street and nearby place details...</p>
)}
<input
type="text"
placeholder="Flat / house / street / nearby landmark"
value={addressDetails}
onChange={(e) => setAddressDetails(e.target.value)}
required
className="w-full rounded-lg border px-4 py-2"
/>
{/* 📱 Mobile */}
<input
type="number"
placeholder="Mobile number"
value={mobile}
onChange={(e) => setMobile(e.target.value)}
className="w-full rounded-lg border px-4 py-2"
/>
{/* ➕ Save */}
<button
disabled={adding || isFetchingAddress}
onClick={addAddress}
className="flex items-center justify-center gap-2 rounded-lg

bg-[#E23744] px-4 py-3 text-white hover:bg-[#d32f3a] disabled:opacity-
50"

>
{adding ? <BiLoader className="animate-spin" /> : <BiPlus />}
Save Address
</button>

{/* 📋 Saved Addresses */}
<div className="space-y-3">
<h2 className="text-lg font-semibold">Saved Addresses</h2>
{loading ? (
<p className="text-sm text-gray-500">Loading...</p>
) : addresses.length === 0 ? (
<p className="text-sm text-gray-500">No addresses saved</p>
) : (
addresses.map((addr) => (
<div
key={addr._id}
className="flex items-center justify-between rounded-lg
border bg-white p-3"
>
<div>

<p className="text-sm font-
medium">{addr.formattedAddress}</p>

<p className="text-xs text-gray-500">📞
{addr.mobile}</p>
</div>
<button
onClick={() => deleteAddress(addr._id)}
disabled={deletingId === addr._id}
className="rounded-lg p-2 text-red-500 hover:bg-red-50
disabled:opacity-50"
>
{deletingId === addr._id ? (
<BiLoader size={16} className="animate-spin" />
) : (
<BiTrash size={16} />
)}
</button>
</div>
))
)}
</div>
</div>
);
};

export default AddAddressPage;