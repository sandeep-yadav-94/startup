import { Router } from "express";
import {
  getDashboardOverview,
  getOrderDetails,
  getSettlementOverview,
  getVerificationOverview,
  recordSettlement,
  updateBusinessVerification,
  updateRiderVerification,
} from "../controllers/admin.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = Router();

router.use(isAdmin);
router.get("/dashboard", getDashboardOverview);
router.get("/settlements", getSettlementOverview);
router.post("/settlements", recordSettlement);
router.get("/orders/:id", getOrderDetails);
router.get("/verification", getVerificationOverview);
router.patch("/businesses/:id/verification", updateBusinessVerification);
router.patch("/riders/:id/verification", updateRiderVerification);

export default router;
