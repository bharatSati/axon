import { Router } from "express";
import {
  getPaymentConfig,
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory
} from "../controllers/paymentController.js";

const router = Router();

router.get("/config", getPaymentConfig);
router.post("/create-order", createPaymentOrder);
router.post("/verify", verifyPayment);
router.get("/history", getPaymentHistory);

export default router;
