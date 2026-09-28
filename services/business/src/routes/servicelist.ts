import express from "express";
import { isAuth, isMerchant } from "../middlewares/isAuth.js";
import { addServiceList, deleteServiceList, getAllServices, toggleServiceListAvailability } from "../controllers/servicelist.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post('/new', isAuth, isMerchant, uploadFile, addServiceList);
router.get('/all/:id', isAuth, getAllServices);
router.delete('/:id', isAuth, isMerchant, deleteServiceList);
router.patch('/status/:id', isAuth, isMerchant, toggleServiceListAvailability);

export default router;