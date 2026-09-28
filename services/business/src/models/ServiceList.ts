import mongoose, {Schema, Document} from 'mongoose';

export interface IServiceList extends Document {
    businessId : mongoose.Types.ObjectId;
    name : string;
    description : string;
    image : string;
    price : number;
    isAvailable : boolean;
    createdAt : Date;
    updatedAt : Date;
}

const schema = new Schema<IServiceList>({
    businessId :{
        type : Schema.Types.ObjectId,
        ref:"business",
        required: true,
        index:true,
    },
    name : {
        type : String,
        trim : true,
        required: true,
    },
    description : {
        type : String,
        trim : true,
    },
    price : {
        type : Number,
        required: true,
    },
    image : {
        type : String,
        required: true,
    },
    isAvailable : {
        type : Boolean,
        default:true
    },
},{
    timestamps:true,
})

export default mongoose.model<IServiceList>("ServiceList", schema);
