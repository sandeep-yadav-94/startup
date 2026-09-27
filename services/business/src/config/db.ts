import mongoose from 'mongoose';
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI is missing. Check services/business/.env.");
    }

    try {
        await mongoose.connect(mongoUri, {
            dbName: "startup",
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);
    }
}

export default connectDB;