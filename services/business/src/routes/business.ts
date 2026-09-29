import express from 'express';
import { isAuth, isMerchant } from '../middlewares/isAuth.js';
import uploadFile from '../middlewares/multer.js';
import { addBusiness, editBusiness, fetchMyBusiness, fetchSingleBusiness, getNearbyBusiness, updateBusinessLocation, updateBusinessStatus } from '../controllers/business.js';

const router = express.Router();

router.post("/new", isAuth, isMerchant, uploadFile, addBusiness);
router.get("/my", isAuth, isMerchant, fetchMyBusiness);
router.put("/edit", isAuth, isMerchant, editBusiness);
router.put("/location", isAuth, isMerchant, updateBusinessLocation);
router.put("/status", isAuth, isMerchant, updateBusinessStatus);
router.get("/all", isAuth, getNearbyBusiness);
router.get("/:id", isAuth, fetchSingleBusiness);


export default router;