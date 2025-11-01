// backend/routes/authRoutes.js
import express from "express";
import { registerPassenger, loginUser } from "../controllers/authController.js";

const router = express.Router();

// ------------------- AUTH ROUTES -------------------
// Public routes
router.post("/register", registerPassenger);
router.post("/login", loginUser);

// You can add protected routes later, e.g.:
// router.get("/profile", authMiddleware, getUserProfile);

export default router;
