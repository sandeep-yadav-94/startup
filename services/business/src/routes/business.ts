import express from 'express';
import { isAuth, isMerchant } from '../middlewares/isAuth.js';
import uploadFile from '../middlewares/multer.js';
import { addBusiness, fetchMyBusiness } from '../controllers/business.js';

const router = express.Router();

router.post("/new", isAuth, isMerchant, uploadFile, addBusiness);
router.get("/my", isAuth, isMerchant, fetchMyBusiness);

export default router;