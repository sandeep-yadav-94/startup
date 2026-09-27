import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import business from "../models/business.js";
import jwt from 'jsonwebtoken';


export const addBusiness = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const user = req.user;

    if(!user){
        return res.status(401).json({
            message: "Unauthorized",
        })
    }
    const existingBusiness = await business.findOne({
        ownerId: user._id,
    })
    if(existingBusiness){
        return res.status(400).json({
            message: "You already have a merchant account..",
        })
    }
    const {name, description, latitude, longitude, formattedAddress, phone} = req.body;
    const latitudeNumber = Number(latitude);
    const longitudeNumber = Number(longitude);
    const phoneNumber = Number(phone);
    if(!name || phone === undefined || phone === null || phone === "" || !Number.isFinite(latitudeNumber) || !Number.isFinite(longitudeNumber) || !Number.isFinite(phoneNumber)){
        return res.status(400).json({
            message:"Please give all details",
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
    const createdBusiness = await business.create({
        name,
        description,
        phone:phoneNumber,
        image:uploadResult.url,
        ownerId:user._id,
        autoLocation:{
            type:"Point",
            coordinates:[longitudeNumber, latitudeNumber],
            formattedAddress,
        }
    })
    console.log("Business created successfully:", JSON.stringify({
        businessId: createdBusiness._id.toString(),
        business: createdBusiness.toObject(),
    }, null, 2));
    return res.status(201).json({
        message:"Business created Successfully",
        business:createdBusiness,
    })
})

export const fetchMyBusiness = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Please login"
        })
    }
    const myBusiness = await business.findOne({ownerId:user._id});
    if(!myBusiness){
        return res.status(404).json({
            message:"Business not found",
        })
    }
    console.log("Fetched business response:", JSON.stringify({
        businessId: myBusiness._id.toString(),
        business: myBusiness.toObject(),
    }, null, 2));
    let token: string | undefined;
    if(!user.businessId){
        const jwtSecret = process.env.JWT_SECRET;
        if(!jwtSecret){
            return res.status(500).json({
                message:"JWT secret is missing",
            })
        }
        token = jwt.sign({
            user:{
                ...user,
                businessId: myBusiness._id.toString(),
            },
        }, jwtSecret, {expiresIn:"15d"})
    }

    return res.status(200).json({
        business:myBusiness,
        ...(token ? {token} : {}),
    })
})

export const editBusiness = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const user = req.user;
    if(!user){
        return res.status(401).json({message:"Please login"});
    }

    const {name, description} = req.body;
    if(typeof name !== "string" || !name.trim()){
        return res.status(400).json({message:"Business name is required"});
    }

    const updatedBusiness = await business.findOneAndUpdate(
        {ownerId:user._id},
        {$set:{name:name.trim(), description:typeof description === "string" ? description.trim() : ""}},
        {new:true, runValidators:true},
    );
    if(!updatedBusiness){
        return res.status(404).json({message:"Business not found"});
    }

    return res.status(200).json({
        message:"Business profile updated",
        business:updatedBusiness,
    });
});

export const updateBusinessStatus = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const user = req.user;
    if(!user){
        return res.status(401).json({message:"Please login"});
    }

    const {status} = req.body;
    if(typeof status !== "boolean"){
        return res.status(400).json({message:"A valid business status is required"});
    }

    const updatedBusiness = await business.findOneAndUpdate(
        {ownerId:user._id},
        {$set:{isOpen:status}},
        {new:true, runValidators:true},
    );
    if(!updatedBusiness){
        return res.status(404).json({message:"Business not found"});
    }

    return res.status(200).json({
        message:status ? "Your business is now open" : "Your business is now closed",
        business:updatedBusiness,
    });
});


