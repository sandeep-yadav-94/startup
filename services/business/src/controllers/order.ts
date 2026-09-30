import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Order from "../models/Order.js";

export const createOrder = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    const {
        businessId,
        businessName,
        distance,
        riderAmount,
        services,
        subtotal,
        deliveryFee,
        platformFee,
        totalAmount,
        addressId,
        deliveryAddress,
        paymentMethod
    } = req.body;

    if(
        !businessId ||
        !businessName ||
        distance===undefined ||
        riderAmount===undefined ||
        !services ||
        !subtotal ||
        deliveryFee===undefined ||
        platformFee===undefined ||
        !totalAmount ||
        !addressId ||
        !deliveryAddress ||
        !paymentMethod
    ){
        return res.status(400).json({
            message:"Please provide all fields"
        })
    }

    const newOrder = await Order.create({
        userId:user._id.toString(),
        businessId,
        businessName,
        riderId:null,
        riderPhone:null,
        riderName:null,
        distance,
        riderAmount,
        services,
        subtotal,
        deliveryFee,
        platformFee,
        totalAmount,
        addressId,
        deliveryAddress,
        status:"placed",
        paymentMethod,
        paymentStatus:"pending",
        expiresAt:new Date(Date.now() + 15 * 60 * 1000)
    });

    res.json({
        message:"Order created successfully",
        order:newOrder,
    })

})