import express from "express";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/payment.js";

const router = express.Router();

router.post("/create/:orderId", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);

export default router;