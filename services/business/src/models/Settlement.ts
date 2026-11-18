import mongoose, { Schema, type Document } from "mongoose";

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

const schema = new Schema<ISettlement>({
    entityType: {
        type: String,
        enum: ["merchant", "rider"],
        required: true,
    },
    entityId: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, required: true, trim: true },
    settledBy: { type: String, required: true },
    settledAt: { type: Date, required: true, default: Date.now },
});

schema.index(
    { entityType: 1, entityId: 1, periodStart: 1, periodEnd: 1 },
    { unique: true },
);

export default mongoose.model<ISettlement>("Settlement", schema);
