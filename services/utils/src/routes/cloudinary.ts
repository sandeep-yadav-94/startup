import express from 'express';
import cloudinary from 'cloudinary';

const router = express.Router();

router.post("/upload", async(req, res)=>{
    try {
        const buffer = req.body?.buffer;
        if (typeof buffer !== "string" || !buffer) {
            return res.status(400).json({
                message: "Please provide an image to upload",
            });
        }
        if (!buffer.startsWith("data:image/")) {
            return res.status(400).json({
                message: "Please provide a valid image to upload",
            });
        }

        const cloud = await cloudinary.v2.uploader.upload(buffer);
        res.json({
            url:cloud.secure_url,
        })
    } catch (error:any) {
        res.status(500).json({
            message:error.message,
        })
    }
})

export default router;