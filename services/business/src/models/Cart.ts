import mongoose, {Schema, Document} from 'mongoose'

export interface ICart extends Document{
    userId: mongoose.Types.ObjectId;
    businessId:mongoose.Types.ObjectId;
    serviceId:mongoose.Types.ObjectId;
    quantity:number;
    createdAt:Date;
    updatedAt:Date;
}

const schema = new Schema<ICart>({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true,
    },
    businessId: {
         type: Schema.Types.ObjectId,
         ref: "Business",
         required: true,
         index:true,
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "ServiceList",
        required: true,
        index:true,
    },
    quantity: {
        type: Number,
        required: true,
        default:1,
        min: 1,
    },
},
    {
        timestamps: true,
    }
)

schema.index(
    { userId: 1, serviceId: 1 },
    { unique: true }
);

export default mongoose.model<ICart>("Cart", schema);