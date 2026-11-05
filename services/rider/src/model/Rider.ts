import mongoose, {Schema, Document} from "mongoose";

export interface IRider extends Document {

  userId : string;
  picture : string;
  riderType : "bike" | "bicycle" | "walking";
  phoneNumber : string;
  addharNumber : string;
  drivingLicenseNumber? : string;
  idProofFront : string;
  idProofBack : string;
  accountNumber : string;
  ifscCode : string;
  upiId? : string;
  upiQrCode? : string;
  isVerified : boolean;
  location : {
    type : "Point";
    coordinates : [number, number];
  };
  isAvailble : boolean;
  isBusy : boolean;
  lastActiveAt : Date;
  createdAt :Date;
  updatedAt : Date;

}


const schema = new Schema<IRider>(
  {
    userId:{
      type: String,
      required : true,
      unique : true,
    },
    picture : {
      type : String,
      required : true,
    },
    riderType : {
      type : String,
      enum : ["bike", "bicycle", "walking"],
      required : true,
      default : "bike",
    },
    phoneNumber : {
      type : String,
      required : true,
      unique : true,
      trim : true,
    },
    addharNumber : {
      type : String,
      required : true,
    },
    drivingLicenseNumber : {
      type : String,
      required : function (this: IRider) {
        return this.riderType === "bike";
      },
    },
    idProofFront : {
      type : String,
      required : true,
    },
    idProofBack : {
      type : String,
      required : true,
    },
    accountNumber : {
      type : String,
      required : true,
    },
    ifscCode : {
      type : String,
      required : true,
    },
    upiId : {
      type : String,
    },
    upiQrCode : {
      type : String,
    },
    isVerified : {
      type : Boolean,
      default : false,
    },
    location : {
      type : {
        type : String,
        enum : ["Point"],
        default : "Point",
      },
      coordinates : {
        type : [Number],
        required : true,
      },
    },
    isAvailble : {
      type : Boolean,
      default : false,
    },
    isBusy : {
      type : Boolean,
      default : false,
    },
    lastActiveAt : {
      type : Date,
      default: Date.now,
    },
  }, {timestamps : true},
);



schema.index({location : "2dsphere"});

export const Rider = mongoose.model<IRider>("Rider", schema);