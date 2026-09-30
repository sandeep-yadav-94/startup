import express from 'express';
import { isAuth } from '../middlewares/isAuth.js';
import { addToCart, clearCart, decrementCartService, fetchMyCart, incrementCartService } from '../controllers/cart.js';

const router = express.Router();

router.post("/add", isAuth, addToCart);
router.get("/all", isAuth, fetchMyCart);
router.put("/inc", isAuth, incrementCartService);
router.put("/dec", isAuth, decrementCartService);
router.delete("/clear", isAuth, clearCart);

export default router;