import axios from "axios";
import { Request, Response } from "express";
import { razorpay } from "../config/razorpay.js";
import { verifyRazorpaySignature } from "../config/verifyRazorpay.js";

export const createRazorpayOrder = async (req: Request, res: Response) => {
  const rawOrderId = req.params.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  const {data} = await axios.get(`${process.env.BUSSINESS_SERVICE_URL}/api/order/payment/${orderId}`, {
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  });

  const razorpayOrder = razorpay.orders.create({
    amount: Math.round(Number(data.totalAmount) * 100),
    currency: "INR",
    receipt: orderId,
  });

  res.json({
    razorpayOrderId: (await razorpayOrder).id,
    key: process.env.RAZORPAY_KEY_ID,
  })
  
}

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string" ||
    typeof orderId !== "string"
  ) {
    return res.status(400).json({ message: "Payment verification details are incomplete" });
  }

  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    return res.status(400).json({ message: "Payment verification failed" });
  }

  try {
    await axios.post(
      `${process.env.BUSSINESS_SERVICE_URL}/api/order/payment/confirm`,
      { orderId },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      },
    );
  } catch (error) {
    console.error("Unable to confirm verified payment with business service:", error);
    return res.status(503).json({
      message: "Payment was verified, but order confirmation is temporarily unavailable. Please retry.",
    });
  }

  res.json({ message: "Payment verified successfully" });
}
