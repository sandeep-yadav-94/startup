import mongoose, {Schema, Document} from 'mongoose';

export interface IBusiness extends Document {
    name : string;
    description?:string;
    image:string;
    ownerId:string;
    phone:number;
    isVerified:boolean;

    autoLocation:{
        type: "Point",
        coordinates: [number, number];
        formattedAddress:string;
    }
    isOpen:boolean;
    createdAt:Date;
}

const schema = new Schema<IBusiness>({
    name:{
        type:String,
        required: true,
        trim:true
    },
    description:String,
    image:{
        type:String,
        required:true
    },
    ownerId:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:Number,
        required:true
    },
    isVerified:{
        type:Boolean,
        required:true,
        default:false,
    },
    autoLocation:{
        type:{
            type:String,
            enum:["Point"],
            required:true,
        },
        coordinates:{
            type:[Number],
            required:true,
        },
        formattedAddress:{
            type:String,

        },
    },
    isOpen:{
        type:Boolean,
        default:false,
    }
},{
    timestamps:true,
}
);

schema.index({autoLocation:"2dsphere"});

export default mongoose.model<IBusiness>("Business", schema);