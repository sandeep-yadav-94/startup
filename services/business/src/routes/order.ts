import express from "express";
import { isAuth, isMerchant } from "../middlewares/isAuth.js";
import { createOrder, fetchBusinessOrders, fetchOrderForPayment, fetchSingleOrder, getMyOrders, updateOrderStatus } from "../controllers/order.js";

const router = express.Router();

router.post("/new", isAuth, createOrder);
router.get("/payment/:orderId", fetchOrderForPayment);
router.get("/order/:businessId", isAuth, isMerchant, fetchBusinessOrders);
router.put("/:orderId", isAuth, isMerchant, updateOrderStatus);
router.get("/my", isAuth, getMyOrders);
router.get("/:id", isAuth, fetchSingleOrder);

export default router;