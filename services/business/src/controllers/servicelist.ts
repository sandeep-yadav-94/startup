import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import business from "../models/business.js";
import ServiceList from "../models/ServiceList.js";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const addServiceList = TryCatch(async(req:AuthenticatedRequest, res)=>{

    if(!req.user){
        return res.status(401).json({
            message:"Please Login",
        })
    }

    const Business = await business.findOne({ownerId:req.user._id});

    if(!Business){
        return res.status(404).json({
            message:"No business found",
        })
    }

    const {name, description, price} = req.body;

    if(!name || !price){
        return res.status(400).json({
            message:"Name and price are required",
        })
    }

    const file = req.file;
    if(!file){
        return res.status(400).json({
            message:"Please provide the image of your business",
        })
    }
    const fileBuffer = getBuffer(file);
    if(!fileBuffer?.content){
        return res.status(500).json({
            message:"Failed to create file buffer",
        })
    }
    const {data:uploadResult} = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
        buffer:fileBuffer.content,
    })
    if(!uploadResult?.url){
        return res.status(502).json({
            message:"Failed to upload business image",
        })
    }

    const service = await ServiceList.create({
        name,
        description,
        price,
        businessId : Business._id,
        image : uploadResult.url,
    })

    res.json({
        message:"Service added successfully",
        service,
    })

    console.log(service);

})



export const getAllServices = TryCatch(async(req:AuthenticatedRequest, res) => {

    const { id } = req.params;
    if(!id){
        return res.status(400).json({
            message:"Id is required",
        })
    }

    const services = await ServiceList.find({businessId : id});

    res.json(services);

})

export const searchServices = TryCatch(async(req:AuthenticatedRequest, res) => {
    const searchTerm = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const latitude = typeof req.query.latitude === "string" ? Number(req.query.latitude) : NaN;
    const longitude = typeof req.query.longitude === "string" ? Number(req.query.longitude) : NaN;
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId.trim() : "";

    if (!searchTerm || searchTerm.length > 100) {
        return res.status(400).json({ message: "A search term of up to 100 characters is required" });
    }
    if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        return res.status(400).json({ message: "Valid latitude and longitude are required" });
    }

    const searchPattern = new RegExp(escapeRegex(searchTerm), "i");
    const businessQuery: Record<string, unknown> = { isVerified: true };
    if (categoryId) businessQuery.categoryId = categoryId;

    const nearbyBusinesses = await business.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                distanceField: "distanceMeters",
                maxDistance: 2000,
                spherical: true,
                query: businessQuery,
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                image: 1,
                categoryName: 1,
                isOpen: 1,
                autoLocation: 1,
                distanceMeters: 1,
            },
        },
    ]);

    if (nearbyBusinesses.length === 0) {
        return res.json({ results: [] });
    }

    const matchingBusinessIds = nearbyBusinesses
        .filter((entry) =>
            searchPattern.test(entry.name ?? "") ||
            searchPattern.test(entry.description ?? "") ||
            searchPattern.test(entry.categoryName ?? ""),
        )
        .map((entry) => entry._id);
    const serviceMatch: Record<string, unknown>[] = [
        { name: searchPattern },
        { description: searchPattern },
    ];
    if (matchingBusinessIds.length > 0) {
        serviceMatch.push({ businessId: { $in: matchingBusinessIds } });
    }

    const services = await ServiceList.find({
        businessId: { $in: nearbyBusinesses.map((entry) => entry._id) },
        $or: serviceMatch,
    })
        .sort({ isAvailable: -1, createdAt: -1 })
        .limit(60)
        .lean();

    const businessesById = new Map(
        nearbyBusinesses.map((entry) => [entry._id.toString(), entry]),
    );
    const results = services.flatMap((service) => {
        const matchedBusiness = businessesById.get(service.businessId.toString());
        if (!matchedBusiness) return [];

        return [{
            ...service,
            business: {
                _id: matchedBusiness._id,
                name: matchedBusiness.name,
                description: matchedBusiness.description,
                image: matchedBusiness.image,
                categoryName: matchedBusiness.categoryName,
                isOpen: matchedBusiness.isOpen,
                autoLocation: matchedBusiness.autoLocation,
                distanceKm: Number((matchedBusiness.distanceMeters / 1000).toFixed(2)),
            },
        }];
    });

    return res.json({ results });
});


export const deleteServiceList = TryCatch(async(req:AuthenticatedRequest, res) => {

    if(!req.user){
        return res.status(401).json({
            message:"Please login",
        })
    }

    const {serviceId} = req.params;
    if(!serviceId){
        return res.status(400).json({
            message:"serviceId is required",
        })
    }

    const service = await ServiceList.findById(serviceId);

    if(!service){
        return res.status(404).json({
            message : "No service found",
        })
    }

    const Business = await business.findOne({
        _id: service.businessId,
        ownerId: req.user._id,
    })

    if(!Business){
        return res.status(404).json({
            message:"You are not authorized to delete this service",
        })
    }

    await service.deleteOne();

    res.json({
        message:"Service deleted successfully",
    })

})




export const toggleServiceListAvailability = TryCatch(async(req:AuthenticatedRequest, res) => {
     if(!req.user){
        return res.status(401).json({
            message:"Please login",
        })
    }

    const {serviceId} = req.params;
    if(!serviceId){
        return res.status(400).json({
            message:"serviceId is required",
        })
    }

    const service = await ServiceList.findById(serviceId);

    if(!service){
        return res.status(404).json({
            message : "No service found",
        })
    }

    const Business = await business.findOne({
        _id: service.businessId,
        ownerId: req.user._id,
    })

    if(!Business){
        return res.status(404).json({
            message:"You are not authorized to delete this service",
        })
    }

    service.isAvailable = !service.isAvailable;

    await service.save();

    res.json({
        message:`Service Marked as ${service.isAvailable ? "available" : "unavailable"}`,
        service,
    })
})