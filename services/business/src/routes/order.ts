import express from "express";
import { isAuth, isMerchant } from "../middlewares/isAuth.js";
import { assignRiderToOrder, createOrder, fetchBusinessOrders, fetchOrderForPayment, fetchSingleOrder, getCurrentOrdersForRider, getMyOrders, updateOrderStatus, updateOrderStatusRider } from "../controllers/order.js";

const router = express.Router();

router.post("/new", isAuth, createOrder);
router.get("/payment/:orderId", fetchOrderForPayment);
router.get("/all/:businessId", isAuth, isMerchant, fetchBusinessOrders);
router.put("/:orderId", isAuth, isMerchant, updateOrderStatus);
router.get("/my", isAuth, getMyOrders);
router.get("/:id", isAuth, fetchSingleOrder);
router.put("/assign/rider", assignRiderToOrder);
router.get("/current/rider", getCurrentOrdersForRider);
router.put("/update/status/rider", updateOrderStatusRider);

export default router;