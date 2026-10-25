import axios from "axios";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import business, { IBusiness } from "../models/business.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import { IServiceList } from "../models/ServiceList.js";

const calculateDistanceKm = (latitude1: number, longitude1: number, latitude2: number, longitude2: number) => {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDifference = radians(latitude2 - latitude1);
    const longitudeDifference = radians(longitude2 - longitude1);
    const haversine =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(radians(latitude1)) *
            Math.cos(radians(latitude2)) *
            Math.sin(longitudeDifference / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const createOrder = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    const {paymentMethod, addressId} = req.body;

    if(!paymentMethod || !addressId){
        return res.status(400).json({
            message:"Please provide payment method and address id"
        })
    }

    const address = await Address.findOne({
        _id:addressId,
        userId:user._id.toString()
    });

    if(!address){
        return res.status(404).json({
            message:"Address not found"
        })
    }

    const cartServices = await Cart.find({
        userId:user._id.toString()
    })
    .populate<{serviceId:IServiceList}>("serviceId")
    .populate<{businessId:IBusiness}>("businessId");

    if(cartServices.length===0){
        return res.status(400).json({
            message:"Cart is empty"
        })
    }

    const firstCartService = cartServices[0];

    if(!firstCartService || !firstCartService.businessId){
        return res.status(400).json({
            message:"Invalid Cart data",
        })
    }

    const businessId = firstCartService.businessId._id.toString();

    const Business = await business.findById(businessId);

    if(!Business){
        return res.status(404).json({
            message:"Business not found"
        })
    }

    if(!Business.isOpen){
        return res.status(400).json({
            message:"Business is not open"
        })
    }

    let subtotal = 0;

    if(cartServices.some((cartService)=>!cartService.serviceId)){
        return res.status(400).json({
            message:"Invalid Cart data",
        })
    }

    const orderServices = cartServices.map((cartService)=>{
        const service = cartService.serviceId as IServiceList;
        subtotal += service.price * cartService.quantity;
        return {
            serviceId: service._id.toString(),
            quantity: cartService.quantity.toString(),
            name: service.name,
            price: service.price.toString(),
        };
    });

    const deliveryFee = subtotal < 250 ? 49 : 0;
    const platformFee = subtotal * 0.05;
    const totalAmount = subtotal + deliveryFee + platformFee;

    const expiresAt = new Date(Date.now() + 15*60*1000);
    const [longitude, latitude] = address.location.coordinates;
    const [businessLongitude, businessLatitude] = Business.autoLocation.coordinates;
    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(businessLongitude) ||
        !Number.isFinite(businessLatitude)
    ) {
        return res.status(400).json({
            message:"Address or business location is invalid",
        })
    }

    const distance = calculateDistanceKm(latitude, longitude, businessLatitude, businessLongitude);

    const riderAmount = Math.ceil(distance*17);

    const order = await Order.create({
        userId: user._id.toString(),
        businessId: businessId.toString(),
        businessName:business.name,
        riderId:null,
        distance,
        riderAmount,
        paymentMethod,
        paymentStatus:"pending",
        expiresAt,
        services: orderServices,
        subtotal,
        deliveryFee,
        platformFee,
        totalAmount,
        addressId: address._id.toString(),
        deliveryAddress:{
            formattedAddress:address.formattedAddress,
            mobile:address.mobile.toString(),
            latitude,
            longitude,
        }

    })

    await Cart.deleteMany({
        userId:user._id.toString()
    });

    res.json({
        message:"Order created successfully",
        orderId:order._id.toString(),
        totalAmount:order.totalAmount.toString(),
    });
});




export const fetchOrderForPayment = TryCatch(async(req, res)=>{

    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message:"Unauthorized"
        })
    }

    const order = await Order.findById(req.params.orderId);
    if(!order){
        return res.status(404).json({
            message:"Order not found"
        })
    }

    if(order.paymentStatus !== "pending"){
        return res.status(400).json({
            message:"Order is already paid or cancelled"
        })
    }

    res.json({
        orderId:order._id.toString(),
        totalAmount:order.totalAmount.toString(),
        currency:"INR",
        paymentMethod:order.paymentMethod,
        expiresAt:order.expiresAt,
    })
})


export const fetchBusinessOrders = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    const {businessId} = req.params;

    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    if(!businessId){
        return res.status(400).json({
            message:"Please provide business id"
        })
    }

    const {limit } = req.query;

    const orders = await Order.find({
        businessId:businessId.toString(),
        paymentStatus:"paid"
    })
    .sort({createdAt:-1})
    .limit(limit ? parseInt(limit as string) : 0);

    res.json({
        success:true,
        count:orders.length,
        message:"Orders fetched successfully",
        orders,
    })
})




const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider"] as const;


export const updateOrderStatus = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    const {orderId} = req.params;
    const {status} = req.body;

    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

     if(!ALLOWED_STATUSES.includes(status)){
        return res.status(400).json({
            message:"Invalid order status"
        })
    }

    const order = await Order.findById(orderId);
    if(!order){
        return res.status(404).json({
            message:"Order not found"
        })
    }
    if(order.paymentStatus !== "paid"){
        return res.status(400).json({
            message:"Order is not paid yet"
        })
    }

    const Business = await business.findById(order.businessId);
    if(!Business){
        return res.status(404).json({
            message:"Business not found"
        })
    }
    if(Business.ownerId.toString() !== user._id.toString()){
        return res.status(403).json({
            message:"You are not authorized to update this order"
        })
    }

    order.status = status;
    await order.save();

    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
        event:"order_updated",
        room:`user_${order.userId}`,
        payload:{
            orderId:order._id.toString(),
            status:order.status,
        },
    },{
        headers:{
            "x-internal-key":process.env.INTERNAL_SERVICE_KEY,
        }
    })

    //now assign riders under 500 meter radius of business location and send them notification about new order

    res.json({
        message:"Order status updated successfully",
        order,
    })

})







export const getMyOrders = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    const orders = await Order.find({
        userId:user._id.toString(),
        paymentStatus:"paid"
    })
    .sort({createdAt:-1});

    res.json({
        orders
    })
})



export const fetchSingleOrder = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
        })
    }

    const order = await Order.findById(req.params.id);

    if(!order){
        return res.status(404).json({
            message:"Order not found"
        })
    }

    if(order.userId.toString() !== user._id.toString()){
        return res.status(403).json({
            message:"You are not authorized to view this order"
        })
    }

    res.json({
        order
    })

})

