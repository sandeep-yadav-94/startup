import mongoose, { Schema, type Document } from "mongoose";

export interface IBusiness extends Document {
  name: string;
  description?: string;
  image: string;
  ownerId: string;
  phone: number;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  upiQrCode?: string;
  isVerified: boolean;
  autoLocation?: {
    formattedAddress?: string;
    coordinates?: [number, number];
  };
  isOpen?: boolean;
  updatedAt?: Date;
  createdAt: Date;
}

export interface IRider extends Document {
  userId: string;
  picture: string;
  phoneNumber: string;
  addharNumber: string;
  drivingLicenseNumber?: string;
  riderType?: string;
  idProofFront?: string;
  idProofBack?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  upiQrCode?: string;
  isVerified: boolean;
  isAvailble: boolean;
  isBusy?: boolean;
  lastActiveAt?: Date;
  updatedAt?: Date;
  createdAt: Date;
}

export interface ISettlement extends Document {
  entityType: "merchant" | "rider";
  entityId: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  reference: string;
  settledBy: string;
  settledAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAdminOrder extends Document {
  userId: string;
  customerName?: string;
  businessId: string;
  businessName: string;
  riderId?: string | null;
  riderUserId?: string | null;
  riderPhone?: string | null;
  riderName?: string | null;
  distance: number;
  riderAmount: number;
  services: Array<{
    serviceId: string;
    name: string;
    price: number | string;
    quantity: number | string;
  }>;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  totalAmount: number;
  addressId: string;
  deliveryAddress: {
    formattedAddress: string;
    mobile: string;
    latitude: number;
    longitude: number;
  };
  status: string;
  reachedAt?: Date | null;
  pickedUpAt?: Date | null;
  deliveredAt?: Date | null;
  paymentMethod: string;
  paymentStatus: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>({}, { strict: false });
const riderSchema = new Schema<IRider>({}, { strict: false });
const userSchema = new Schema<IUser>({}, { strict: false });
const orderSchema = new Schema<IAdminOrder>({}, { strict: false });
const settlementSchema = new Schema<ISettlement>(
  {
    entityType: { type: String, enum: ["merchant", "rider"], required: true },
    entityId: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, required: true, trim: true },
    settledBy: { type: String, required: true },
    settledAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);
settlementSchema.index(
  { entityType: 1, entityId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);

export const Business = mongoose.model<IBusiness>("AdminBusiness", businessSchema, "businesses");
export const Rider = mongoose.model<IRider>("AdminRider", riderSchema, "riders");
export const User = mongoose.model<IUser>("AdminUser", userSchema, "users");
export const Order = mongoose.model<IAdminOrder>("AdminOrder", orderSchema, "orders");
export const Settlement = mongoose.model<ISettlement>("Settlement", settlementSchema, "settlements");
