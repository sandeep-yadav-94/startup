import express from 'express';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import cors from 'cors';
import uploadRoutes from './routes/cloudinary.js';
dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const app = express();

if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Missing Cloudinary credentials in environment variables');
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
});

app.use("/api", uploadRoutes);

app.use(cors());

app.use(express.json({limit:"50mb"}));
app.use(express.urlencoded({limit:"50mb", extended:true}));

const PORT = process.env.PORT || 5002

app.listen(PORT, ()=>{
    console.log(`utils services is running on port ${PORT}`);
})