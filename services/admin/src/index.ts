import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const start = async () => {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/admin", adminRoutes);

  const port = Number(process.env.PORT) || 5006;
  app.listen(port, () => {
    console.log(`Admin service is running on port ${port}`);
  });
};

void start().catch((error: unknown) => {
  console.error("Failed to start admin service:", error);
  process.exitCode = 1;
});
