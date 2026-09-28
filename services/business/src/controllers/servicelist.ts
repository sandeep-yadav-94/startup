import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import business from "../models/business.js";
import ServiceList from "../models/ServiceList.js";

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