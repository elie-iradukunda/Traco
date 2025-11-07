import express from "express";
import {
  submitReview,
  getReviews,
  getAverageRating
} from "../controllers/reviewsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, submitReview);
router.get("/", getReviews);
router.get("/average", getAverageRating);

export default router;

