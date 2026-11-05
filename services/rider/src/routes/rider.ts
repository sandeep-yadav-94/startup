import express from 'express'
import { isAuth } from '../middlewares/isAuth.js';
import { acceptOrder, addRiderProfile, fetchMyCurrentOrder, fetchMyProfile, publishRiderLocation, toggleRiderAvailability, updateOrderStatus, updateRiderLocation } from '../controllers/rider.js';
import uploadFile from '../middlewares/multer.js';

const router = express.Router();

router.get("/myprofile", isAuth, fetchMyProfile);
router.patch("/toggle", isAuth, toggleRiderAvailability);
router.patch("/location", isAuth, updateRiderLocation);
router.post("/new", isAuth, uploadFile, addRiderProfile);
router.post("/accept/:orderId", isAuth, acceptOrder);
router.get("/order/current/", isAuth, fetchMyCurrentOrder);
router.post("/order/:orderId/location", isAuth, publishRiderLocation);
router.put("/order/update/:orderId", isAuth, updateOrderStatus);

export default router;