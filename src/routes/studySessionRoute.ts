import { Router } from "express";
import { requireAuth } from "../middleware/authmiddleware.js";
import {
  discardSession,
  endSession,
  getActiveSession,
  getProgress,
  pauseSession,
  resumeSession,
  startSession,
} from "../controllers/studySession.js";

const router = Router();

// Stopwatch study sessions on a roadmap; ticks made while one is open are logged to it
router.get("/study-sessions/active", requireAuth, getActiveSession);
router.post("/study-sessions", requireAuth, startSession);
router.post("/study-sessions/:sessionId/pause", requireAuth, pauseSession);
router.post("/study-sessions/:sessionId/resume", requireAuth, resumeSession);
router.post("/study-sessions/:sessionId/end", requireAuth, endSession);
router.delete("/study-sessions/:sessionId", requireAuth, discardSession);

// Daily totals, streak and recent sessions
router.get("/progress", requireAuth, getProgress);

export default router;
