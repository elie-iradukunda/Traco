import express from "express";
import {
  chatWithBot,
  getChatHistory
} from "../controllers/chatbotController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Chat with bot (works with or without auth for basic queries)
router.post("/chat", chatWithBot);
router.get("/history/:user_id", authMiddleware, getChatHistory);

export default router;

