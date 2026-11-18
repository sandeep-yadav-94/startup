import axios from "axios";
import getBuffer from "../config/datauri.js";
import { getBusinessCategoryById } from "../config/businessCategories.js";
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
    const {name, description, latitude, longitude, formattedAddress, phone, categoryId, categoryName, accountNumber, ifscCode, upiId} = req.body;
    const latitudeNumber = Number(latitude);
    const longitudeNumber = Number(longitude);
    const phoneNumber = Number(phone);
    const cleanAccountNumber = typeof accountNumber === "string" ? accountNumber.trim() : "";
    const cleanIfscCode = typeof ifscCode === "string" ? ifscCode.trim().toUpperCase() : "";
    const cleanUpiId = typeof upiId === "string" ? upiId.trim() : "";
    const uploadedFiles = req.files;
    const upiQrCodeFile = uploadedFiles && !Array.isArray(uploadedFiles) ? uploadedFiles.upiQrCode?.[0] : undefined;
    const selectedCategory = typeof categoryId === "string" ? getBusinessCategoryById(categoryId) : null;

    if(!/^\d{6,20}$/.test(cleanAccountNumber) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfscCode)){
        return res.status(400).json({
            message:"Please provide a valid bank account number and IFSC code",
        })
    }
    if(cleanUpiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(cleanUpiId)){
        return res.status(400).json({
            message:"Please provide a valid UPI ID",
        })
    }
    if(!cleanUpiId && !upiQrCodeFile){
        return res.status(400).json({
            message:"Please provide a UPI ID or UPI QR code",
        })
    }

    if(categoryId !== undefined && categoryId !== null && categoryId !== "" && !selectedCategory){
        return res.status(400).json({
            message:"Please select a valid business category",
        });
    }

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
    let upiQrCodeUrl: string | null = null;
    if(upiQrCodeFile){
        const qrBuffer = getBuffer(upiQrCodeFile);
        if(!qrBuffer?.content){
            return res.status(500).json({
                message:"Failed to process UPI QR code",
            })
        }
        const {data:qrUploadResult} = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
            buffer:qrBuffer.content,
        })
        if(!qrUploadResult?.url){
            return res.status(502).json({
                message:"Failed to upload UPI QR code",
            })
        }
        upiQrCodeUrl = qrUploadResult.url;
    }
    const categoryValue = selectedCategory ? selectedCategory.name : undefined;
    const safeCategoryName = typeof categoryName === "string" && categoryName.trim() ? categoryName.trim() : categoryValue;

    const createdBusiness = await business.create({
        name,
        description,
        phone:phoneNumber,
        accountNumber:cleanAccountNumber,
        ifscCode:cleanIfscCode,
        upiId:cleanUpiId || null,
        upiQrCode:upiQrCodeUrl,
        image:uploadResult.url,
        ownerId:user._id,
        categoryId: selectedCategory?.id ?? null,
        categoryName: safeCategoryName ?? null,
        autoLocation:{
            type:"Point",
            coordinates:[longitudeNumber, latitudeNumber],
            formattedAddress,
        }
    })
    const publicBusiness = createdBusiness.toObject();
    for (const field of ["accountNumber", "ifscCode", "upiId", "upiQrCode"]) {
        Reflect.deleteProperty(publicBusiness, field);
    }
    console.log("Business created successfully:", JSON.stringify({
        businessId: createdBusiness._id.toString(),
    }));
    return res.status(201).json({
        message:"Business created Successfully",
        business:publicBusiness,
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

export const getBusinessPayoutDetails = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const user = req.user;
    if(!user || user.role !== "merchant"){
        return res.status(403).json({message:"Merchant access required"});
    }

    const merchantBusiness = await business.findOne({ownerId:user._id}).select(
        "+accountNumber +ifscCode +upiId +upiQrCode",
    );
    if(!merchantBusiness){
        return res.status(404).json({message:"Business not found"});
    }

    return res.json({
        accountNumber:merchantBusiness.accountNumber ?? "",
        ifscCode:merchantBusiness.ifscCode ?? "",
        upiId:merchantBusiness.upiId ?? "",
        upiQrCode:merchantBusiness.upiQrCode ?? null,
    });
});

export const updateBusinessPayoutDetails = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const user = req.user;
    if(!user || user.role !== "merchant"){
        return res.status(403).json({message:"Merchant access required"});
    }

    const accountNumber = typeof req.body.accountNumber === "string" ? req.body.accountNumber.trim() : "";
    const ifscCode = typeof req.body.ifscCode === "string" ? req.body.ifscCode.trim().toUpperCase() : "";
    const upiId = typeof req.body.upiId === "string" ? req.body.upiId.trim() : "";
    const files = req.files;
    const upiQrCodeFile = files && !Array.isArray(files) ? files.upiQrCode?.[0] : undefined;

    if(!/^\d{6,20}$/.test(accountNumber) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)){
        return res.status(400).json({message:"Please provide a valid bank account number and IFSC code"});
    }
    if(upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId)){
        return res.status(400).json({message:"Please provide a valid UPI ID"});
    }

    const merchantBusiness = await business.findOne({ownerId:user._id}).select("+upiQrCode");
    if(!merchantBusiness){
        return res.status(404).json({message:"Business not found"});
    }
    if(!upiId && !upiQrCodeFile && !merchantBusiness.upiQrCode){
        return res.status(400).json({message:"Please provide a UPI ID or UPI QR code"});
    }

    let upiQrCodeUrl = merchantBusiness.upiQrCode ?? null;
    if(upiQrCodeFile){
        const qrBuffer = getBuffer(upiQrCodeFile);
        if(!qrBuffer?.content){
            return res.status(500).json({message:"Failed to process UPI QR code"});
        }
        const {data:uploadResult} = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
            buffer:qrBuffer.content,
        });
        if(typeof uploadResult?.url !== "string" || !uploadResult.url){
            return res.status(502).json({message:"Failed to upload UPI QR code"});
        }
        upiQrCodeUrl = uploadResult.url;
    }

    merchantBusiness.accountNumber = accountNumber;
    merchantBusiness.ifscCode = ifscCode;
    merchantBusiness.upiId = upiId || null;
    merchantBusiness.upiQrCode = upiQrCodeUrl;
    await merchantBusiness.save();

    return res.json({
        message:"Payout details saved",
        upiQrCode:merchantBusiness.upiQrCode ?? null,
    });
});

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

export const updateBusinessLocation = TryCatch(async(req:AuthenticatedRequest, res)=>{
    const user = req.user;
    if(!user){
        return res.status(401).json({message:"Please login"});
    }

    const {latitude, longitude, formattedAddress} = req.body;
    if(typeof formattedAddress !== "string" || !formattedAddress.trim()){
        return res.status(400).json({message:"A valid business address is required"});
    }

    const updates: { "autoLocation.formattedAddress": string; "autoLocation.coordinates"?: number[] } = {
        "autoLocation.formattedAddress":formattedAddress.trim(),
    };
    if(latitude !== undefined || longitude !== undefined){
        const latitudeNumber = Number(latitude);
        const longitudeNumber = Number(longitude);
        if(!Number.isFinite(latitudeNumber) || latitudeNumber < -90 || latitudeNumber > 90 || !Number.isFinite(longitudeNumber) || longitudeNumber < -180 || longitudeNumber > 180){
            return res.status(400).json({message:"A valid location is required"});
        }
        updates["autoLocation.coordinates"] = [longitudeNumber, latitudeNumber];
    }

    const updatedBusiness = await business.findOneAndUpdate(
        {ownerId:user._id},
        {$set:updates},
        {new:true, runValidators:true},
    );
    if(!updatedBusiness){
        return res.status(404).json({message:"Business not found"});
    }

    return res.status(200).json({
        message:"Business address updated",
        business:updatedBusiness,
    });
});


export const getNearbyBusiness = TryCatch(async(req, res) => {
    const { latitude, longitude, radius=2000, search="", categoryId } = req.query;
    if(!latitude || !longitude){
        return res.status(400).json({
            message:"Latitude and Longitude are required",
        })
    }
    const query : any = {
        isVerified:true
    }
    if(search && typeof search === "string"){
        query.name = {$regex : search, $option : "i"};
    }
    if(categoryId && typeof categoryId === "string" && categoryId.trim()){
        query.categoryId = categoryId.trim();
    }
    const businesses = await business.aggregate([
        {
            $geoNear : {
                near:{
                    type:"Point",
                    coordinates: [Number(longitude), Number(latitude)]
                },
                distanceField: "distance",
                maxDistance:Number(radius),
                spherical:true,
                query,
            }
        },
        {
            $sort:{
                isOpen : -1,
                distance : 1
            },
        },
        {
            $addFields:{
                distanceKm:{
                    $round:[{$divide : ["$distance", 1000]}, 2]
                }
            }
        },
        {
            $project:{
                accountNumber:0,
                ifscCode:0,
                upiId:0,
                upiQrCode:0,
            }
        }
    ])
    res.json({
        success:true,
        count : businesses.length,
        businesses,
    })
})



export const fetchSingleBusiness = TryCatch(async(req,res)=>{
    const businessId = req.params.id;
    if(typeof businessId !== "string" || !/^[0-9a-fA-F]{24}$/.test(businessId)){
        return res.status(400).json({message:"Invalid business ID"});
    }
    const b = await business.findById(businessId);
    if(!b){
        return res.status(404).json({message:"Business not found"});
    }
    res.json(b);
})


