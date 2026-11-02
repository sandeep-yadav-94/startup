import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Configure services/admin/.env.");
  }

  await mongoose.connect(mongoUri, { dbName: "startup" });
  console.log("Admin service connected to MongoDB");
};

export default connectDB;
