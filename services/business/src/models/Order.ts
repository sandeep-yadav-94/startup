import mongoose, {Schema, Document} from "mongoose";

export interface IOrder extends Document {
    userId:string;
    businessId:string;
    businessName:string;
    riderId?: string | null;
    riderPhone: number | null;
    riderName: string | null;
    distance: number;
    riderAmount: number;
    services:{
        serviceId:string;
        name:string;
        price:string;
        quantity:string;
    }[];
    subtotal:number;
    deliveryFee:number;
    platformFee:number;
    totalAmount:number;
    addressId:string;
    deliveryAddress:{
        formattedAddress:string;
        mobile:string;
        latitude:number;
        longitude:number;
    };
    status: | "placed" | "accepted" | "preparing" | "wait for rider" | "rider_assigned" | "picked_up" | "reached" | "canceled";
    paymentMethod:"razorpay";
    paymentStatus:"pending" | "paid" | "failed";
    expiresAt: Date;
    createdAt : Date;
    updatedAt: Date;
}



const OrderSchema = new Schema<IOrder>(
    {
        userId:{
            type:String,
            required:true,
        },

        businessId:{
            type:String,
            required:true,
        },

        businessName:{
            type:String,
            required:true,
        },

        riderId:{
            type:String,
            default:null,
        },

        riderPhone:{
            type:Number,
            default:null,
        },

        riderName:{
            type:String,
            default:null,
        },

        distance:{
            type:Number,
            required:true,
        },

        riderAmount:{
            type:Number,
            required:true,
        },

        services:[
            {
                serviceId:{
                    type:String,
                    required:true,
                },
                name:{
                    type:String,
                    required:true,
                },
                price:{
                    type:Number,
                    required:true,
                },
                quantity:{
                    type:Number,
                    required:true,
                },
            }
        ],

        subtotal:{
            type:Number,
            required:true,
        },

        deliveryFee:{
            type:Number,
            required:true,
        },

        platformFee:{
            type:Number,
            required:true,
        },

        totalAmount:{
            type:Number,
            required:true,
        },

        addressId:{
            type:String,
            required:true,
        },

        deliveryAddress:{
            formattedAddress:{
                type:String,
                required:true,
            },
            mobile:{
                type:String,
                required:true,
            },
            latitude:{
                type:Number,
                required:true,
            },
            longitude:{
                type:Number,
                required:true,
            },
        },

        status:{
            type:String,
            enum:[
                "placed",
                "accepted",
                "preparing",
                "wait for rider",
                "rider_assigned",
                "picked_up",
                "reached",
                "canceled"
            ],
            default:"placed",
        },

        paymentMethod:{
            type:String,
            enum:["razorpay"],
            required:true,
        },

        paymentStatus:{
            type:String,
            enum:["pending","paid","failed"],
            default:"pending",
        },

        expiresAt:{
            type:Date,
            index:{expireAfterSeconds:0},
        },
    },
    {
        timestamps:true,
    }
);

export default mongoose.model<IOrder>("Order", OrderSchema);

