import express from "express";
import connectDB from "./config/db.js";
import businessRoutes from "./routes/business.js"

const app = express();

const PORT = process.env.PORT || 5001;

app.use("/api/business", businessRoutes)

app.listen(PORT, ()=>{
    console.log(`Business service is running on port ${PORT}`);
    connectDB();
});
