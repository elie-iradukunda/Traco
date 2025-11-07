import express from "express";
import {
  getLoyaltyPoints,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyHistory
} from "../controllers/loyaltyController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:passenger_id", authMiddleware, getLoyaltyPoints);
router.post("/add", authMiddleware, addLoyaltyPoints);
router.post("/redeem", authMiddleware, redeemLoyaltyPoints);
router.get("/:passenger_id/history", authMiddleware, getLoyaltyHistory);

export default router;

