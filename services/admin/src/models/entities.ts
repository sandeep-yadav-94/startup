import mongoose, { Schema, type Document } from "mongoose";

export interface IBusiness extends Document {
  name: string;
  description?: string;
  image: string;
  ownerId: string;
  phone: number;
  isVerified: boolean;
  autoLocation?: {
    formattedAddress?: string;
  };
  createdAt: Date;
}

export interface IRider extends Document {
  userId: string;
  picture: string;
  phoneNumber: string;
  addharNumber: string;
  drivingLicenseNumber: string;
  isVerified: boolean;
  isAvailble: boolean;
  isBusy?: boolean;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
}

const businessSchema = new Schema<IBusiness>({}, { strict: false });
const riderSchema = new Schema<IRider>({}, { strict: false });
const userSchema = new Schema<IUser>({}, { strict: false });

export const Business = mongoose.model<IBusiness>("AdminBusiness", businessSchema, "businesses");
export const Rider = mongoose.model<IRider>("AdminRider", riderSchema, "riders");
export const User = mongoose.model<IUser>("AdminUser", userSchema, "users");
export const Order = mongoose.model("AdminOrder", new Schema({}, { strict: false }), "orders");
