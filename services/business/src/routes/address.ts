import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { addAddress, deleteAddress, getMyAddresses, reverseGeocode } from "../controllers/address.js";

const router = express.Router();

router.get("/reverse", reverseGeocode);
router.post("/new", isAuth, addAddress);
router.delete("/:id", isAuth, deleteAddress);
router.get("/all", isAuth, getMyAddresses);


export default router;