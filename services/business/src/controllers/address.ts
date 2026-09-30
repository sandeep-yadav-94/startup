import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import axios from "axios";

const reverseGeocodeCache = new Map<string, unknown>();
let reverseGeocodeQueue: Promise<void> = Promise.resolve();
let lastNominatimRequestAt = 0;
let nominatimBlockedUntil = 0;

export const reverseGeocode = TryCatch(async (req, res) => {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ message: "Valid latitude and longitude are required" });
    }

    const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cachedResult = reverseGeocodeCache.get(cacheKey);
    if (cachedResult) {
        return res.json(cachedResult);
    }

    const previousRequest = reverseGeocodeQueue;
    let releaseQueue!: () => void;
    reverseGeocodeQueue = new Promise<void>((resolve) => {
        releaseQueue = resolve;
    });
    await previousRequest;

    try {
        if (Date.now() < nominatimBlockedUntil) {
            return res.status(429).json({ message: "Reverse geocoding is temporarily rate limited" });
        }

        const waitTime = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));
        if (waitTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
            params: { format: "jsonv2", lat: latitude, lon: longitude, zoom: 18 },
            headers: {
                Accept: "application/json",
                "User-Agent": "StartupApp/1.0 (reverse geocoding)",
            },
            timeout: 10000,
        });
        lastNominatimRequestAt = Date.now();

        if (reverseGeocodeCache.size >= 500) {
            const oldestKey = reverseGeocodeCache.keys().next().value;
            if (oldestKey) reverseGeocodeCache.delete(oldestKey);
        }
        reverseGeocodeCache.set(cacheKey, data);
        return res.json(data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            const retryAfter = Number(error.response.headers["retry-after"]);
            nominatimBlockedUntil = Date.now() + Math.max(60000, retryAfter * 1000 || 0);
            return res.status(429).json({ message: "Reverse geocoding is temporarily rate limited" });
        }
        throw error;
    } finally {
        releaseQueue();
    }
});






export const addAddress = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    const {mobile, formattedAddress, latitude, longitude} =  req.body;
    if(!mobile || !formattedAddress || latitude===undefined || longitude===undefined){
        return res.status(400).json({
            message:"Please provide all fields"
        })
    }

    const newAddress = await Address.create({
        userId: user._id.toString(),
        mobile,
        formattedAddress,
        location:{
            type:"Point",
            coordinates:[Number(longitude), Number(latitude)]
        }
    });

    res.json({
        message:"Address added successfully",
        address:newAddress,
    })
    
})






export const deleteAddress = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    const {id} = req.params;

    if(!id){
        return res.status(400).json({
            message:"Address id is required"
        })
    }

    const address = await Address.findOneAndDelete({
        _id: id,
        userId: user._id.toString()
    });

    if(!address){
        return res.status(404).json({
            message:"Address not found"
        })
    }

    res.json({
        message:"Address deleted successfully",
        address,
    })

})






export const getMyAddresses = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    const addresses = await Address.find({
        userId: user._id.toString()
    }).sort({createdAt: -1});

    res.json({
        message:"Addresses fetched successfully",
        addresses,
    })

})