import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Cart from "../models/Cart.js";

export const addToCart = TryCatch(async(req:AuthenticatedRequest, res)=>{

    if(!req.user){
        return res.status(401).json({
            message:"Please login",
        })
    }

    const userId = req.user._id;
    const {businessId, serviceId} = req.body;

    if(!mongoose.Types.ObjectId.isValid(businessId) || !mongoose.Types.ObjectId.isValid(serviceId)){
        return res.status(400).json({
            message:"Invalid businessId or serviceId",
        })
    }

    const cartFromDifferentBusiness = await Cart.findOne({
        userId,
        businessId : {$ne : businessId},
    })

    if(cartFromDifferentBusiness){
        return res.status(400).json({
            message:"You can order from only one business at a time.Please clear your cart first to add service from this business",
        })
    }

    const cartService = await Cart.findOneAndUpdate({
        userId, businessId, serviceId
    }, {
        $inc:{quantity:1},
        $setOnInsert: {userId, businessId, serviceId},
    }, {
        upsert:true,
        new:true,
        setDefaultsOnInsert:true,
    })

    return res.json({
        message:"Service added to cart",
        cart: cartService,
    })
    
})



export const fetchMyCart = TryCatch(async(req:AuthenticatedRequest, res)=>{

    if(!req.user){
        return res.status(401).json({
            message:"Please login",
        })
    }

    const userId = req.user._id;

    const cartServices = await Cart.find({userId}).populate("serviceId").populate("businessId");

    let subtotal = 0;
    let cartLength = 0;

    for(const cartService of cartServices){
        const service:any = cartService.serviceId;
        subtotal += service.price * cartService.quantity;
        cartLength += cartService.quantity;
    }

    return res.json({
        success:true,
        cartLength,
        subtotal,
        cart:cartServices,
    })

})



export const incrementCartService = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const userId = req.user?._id;
    const { serviceId } = req.body;

    if(!userId || !serviceId){
        return res.status(400).json({
            message:"Invalid req"
        })
    }

    const cartService = await Cart.findOneAndUpdate({userId, serviceId}, {
        $inc:{quantity:1}
    },
{
    new:true,
})

if(!cartService){
    return res.status(404).json({
        message:"Service not found"
    })
}

res.json({
    message:"No. of people increased",
    cartService,
})

})




export const decrementCartService = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const userId = req.user?._id;
    const { serviceId } = req.body;

    if(!userId || !serviceId){
        return res.status(400).json({
            message:"Invalid req"
        })
    }

    const cartService = await Cart.findOne({userId, serviceId})

if(!cartService){
    return res.status(404).json({
        message:"Service not found"
    })
}

if(cartService.quantity === 1){
    await Cart.deleteOne({userId, serviceId});
    return res.json({
        message:"item removed"
    })
}

cartService.quantity -= 1;
await cartService.save();

res.json({
    message:"No. of people decreased",
    cartService,
})

})




export const clearCart = TryCatch(async(req:AuthenticatedRequest, res)=>{

    if(!req.user){
        return res.status(401).json({
            message:"Please login",
        })
    }

    const userId = req.user._id;

    await Cart.deleteMany({userId});

    return res.json({
        success:true,
        message:"Cart cleared successfully",
    })

})