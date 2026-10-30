import axios from "axios";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import business, { IBusiness } from "../models/business.js";
import Cart from "../models/Cart.js";
import Order, { type IOrder } from "../models/Order.js";
import { IServiceList } from "../models/ServiceList.js";
import { publishEvent } from "../config/order.publisher.js";

const emitOrderEvent = async (
    order: IOrder,
    event: string,
    payload: Record<string, unknown>,
) => {
    let businessOwnerId: string | undefined;
    try {
        const orderBusiness = await business.findById(order.businessId).select("ownerId");
        businessOwnerId = orderBusiness?.ownerId.toString();
    } catch (error) {
        console.error(`Failed to find business owner for order ${order._id}:`, error);
    }

    const rooms = [
        order.userId,
        ...(businessOwnerId ? [businessOwnerId] : []),
        ...(order.riderUserId ? [order.riderUserId] : []),
    ];
    const results = await Promise.allSettled(
        rooms.map((room) =>
            axios.post(
                `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
                { event, room, payload },
                {
                    headers: {
                        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
                    },
                },
            ),
        ),
    );

    results.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(`Failed to emit ${event} to room ${rooms[index]}:`, result.reason);
        }
    });
};

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
        customerName: user.name,
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




const NEXT_BUSINESS_STATUS: Record<string, string> = {
    placed: "accepted",
    accepted: "preparing",
    preparing: "ready_for_rider",
    ready_for_rider: "ready_for_rider",
};


export const updateOrderStatus = TryCatch(async(req:AuthenticatedRequest, res)=>{

    const user = req.user;
    const {orderId} = req.params;
    const {status} = req.body;

    if(!user){
        return res.status(401).json({
            message:"Unauthorized"
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

    if (NEXT_BUSINESS_STATUS[order.status] !== status) {
        return res.status(409).json({
            message: "Order status cannot move to the requested state",
        });
    }

    order.status = status;
    await order.save();

    await emitOrderEvent(order, "order_update", {
        orderId: order._id.toString(),
        status: order.status,
    });

    //now assign riders under 500 meter radius of business location and send them notification about new order

    if(status === "ready_for_rider"){
        console.log("Publishing order ready for rider event for order", order._id);

        await publishEvent("ORDER_READY_FOR_RIDER", {
        orderId : order._id.toString(),
        businessId : Business._id.toString(),
        location : Business.autoLocation,
    })

    console.log("Event published successfully...");
    
    }

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




export const assignRiderToOrder = TryCatch(async(req, res) => {

    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message:"Unauthorized"
        })
    }

    const {orderId, riderId, riderUserId, riderName, riderPhone} = req.body;
    if (
        typeof orderId !== "string" ||
        typeof riderId !== "string" ||
        typeof riderUserId !== "string" ||
        typeof riderName !== "string" ||
        typeof riderPhone !== "string"
    ) {
        return res.status(400).json({ message: "Invalid order or rider details" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    if (order.paymentStatus !== "paid" || order.status !== "ready_for_rider") {
        return res.status(409).json({ message: "Order is not ready to be accepted" });
    }

    const riderHasActiveOrder = await Order.exists({
        riderId,
        status: { $in: ["rider_assigned", "reached", "picked_up"] },
    });
    if (riderHasActiveOrder) {
        return res.status(409).json({ message: "Rider already has an active order" });
    }

    const orderUpdated = await Order.findOneAndUpdate(
        {
            _id: orderId,
            paymentStatus: "paid",
            status: "ready_for_rider",
            riderId: null,
        },
        {
            $set: {
                riderId,
                riderUserId,
                riderName,
                riderPhone,
                status: "rider_assigned",
            },
        },
        { new: true, runValidators: true },
    );
    if (!orderUpdated) {
        return res.status(409).json({ message: "Order has already been accepted" });
    }

    const orderPayload = {
        ...orderUpdated.toObject(),
        _id: orderUpdated._id.toString(),
        orderId: orderUpdated._id.toString(),
    };
    await emitOrderEvent(orderUpdated, "order:rider_assigned", orderPayload);

    res.json({
        message : "Rider assigned successfully...",
        success : true,
        order: orderUpdated,
    })

})




export const getCurrentOrdersForRider = TryCatch(async(req, res) => {

    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message:"Unauthorized"
        })
    }

    const riderId = req.query.riderId;
    if(typeof riderId !== "string" || !riderId){
        return res.status(400).json({
            message : "Rider id is required",
        })
    }

    const order = await Order.findOne({
        riderId,
        status: { $in: ["rider_assigned", "reached", "picked_up"] },
    }).sort({ updatedAt: -1 });

    if (!order) {
        return res.json({ order: null });
    }

    const orderBusiness = await business.findById(order.businessId).select("autoLocation");
    res.json({
        order: {
            ...order.toObject(),
            customerName: order.customerName || "Customer",
            businessAddress: orderBusiness?.autoLocation?.formattedAddress || "Business address unavailable",
        },
    });

})




export const updateOrderStatusRider = TryCatch(async(req,res)=> {

    if(req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY){
        return res.status(403).json({
            message:"Unauthorized"
        })
    }

    const { orderId, riderId } = req.body;
    if (typeof orderId !== "string" || typeof riderId !== "string") {
        return res.status(400).json({ message: "Order and rider ids are required" });
    }

    const order = await Order.findOne({ _id: orderId, riderId });
    if (!order) {
        return res.status(404).json({ message: "Assigned order not found" });
    }

    const nextStatus =
        order.status === "rider_assigned"
            ? "reached"
            : order.status === "reached"
                ? "picked_up"
                : order.status === "picked_up"
                    ? "delivered"
                    : null;
    if (!nextStatus) {
        return res.status(409).json({ message: "Order cannot be advanced from its current status" });
    }

    const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, riderId, status: order.status },
        { $set: { status: nextStatus } },
        { new: true, runValidators: true },
    );
    if (!updatedOrder) {
        return res.status(409).json({ message: "Order status was updated by another request" });
    }

    await emitOrderEvent(updatedOrder, "order_update", {
        orderId: updatedOrder._id.toString(),
        status: updatedOrder.status,
    });
    return res.json({
        message: "Order status updated successfully",
        order: updatedOrder,
    });

})
