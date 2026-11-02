import { Router } from "express";
import {
  getDashboardOverview,
  getVerificationOverview,
  updateBusinessVerification,
  updateRiderVerification,
} from "../controllers/admin.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = Router();

router.use(isAdmin);
router.get("/dashboard", getDashboardOverview);
router.get("/verification", getVerificationOverview);
router.patch("/businesses/:id/verification", updateBusinessVerification);
router.patch("/riders/:id/verification", updateRiderVerification);

export default router;
