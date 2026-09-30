import express from "express";
import connectDB from "./config/db.js";
import businessRoutes from "./routes/business.js"
import serviceRoutes from "./routes/servicelist.js"
import cartRoutes from './routes/cart.js'
import dotenv from "dotenv";
import cors from "cors"
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.use("/api/business", businessRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/cart", cartRoutes);


app.listen(PORT, ()=>{
    console.log(`Business service is running on port ${PORT}`);
    connectDB();
});
