import express from "express";
import { isAuth, isMerchant } from "../middlewares/isAuth.js";
import { assignRiderToOrder, confirmOrderPayment, createOrder, fetchBusinessOrders, fetchOrderForPayment, fetchSingleOrder, getCurrentOrdersForRider, getMerchantEarnings, getMyOrders, getRiderEarnings, updateOrderStatus, updateOrderStatusRider } from "../controllers/order.js";

const router = express.Router();

router.post("/new", isAuth, createOrder);
router.get("/earnings/merchant", isAuth, isMerchant, getMerchantEarnings);
router.get("/earnings/rider", isAuth, getRiderEarnings);
router.get("/payment/:orderId", fetchOrderForPayment);
router.post("/payment/confirm", confirmOrderPayment);
router.get("/all/:businessId", isAuth, isMerchant, fetchBusinessOrders);
router.put("/:orderId", isAuth, isMerchant, updateOrderStatus);
router.get("/my", isAuth, getMyOrders);
router.get("/:id", isAuth, fetchSingleOrder);
router.put("/assign/rider", assignRiderToOrder);
router.get("/current/rider", getCurrentOrdersForRider);
router.put("/update/status/rider", updateOrderStatusRider);

export default router;