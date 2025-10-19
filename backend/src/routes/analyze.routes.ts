import express, { Router, Request, Response } from "express";
import { geminiService } from "../services/gemini.service.js";
import { AnalysisRequest } from "../types/index.js";

const router = Router();

//health check
router.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
});

//single claim analysis
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { claim } = req.body as AnalysisRequest;

    if (!claim || claim.trim().length === 0) {
      return res.status(400).json({
        error: "Claim is required",
      });
    }

    if (claim.length > 1000) {
      return res.status(400).json({
        error: "Claim must be less than 1000 characters",
      });
    }

    console.log(`📝 Analyzing claim: ${claim}`);

    const analysis = await geminiService.analyzeClaim(claim);

    console.log(`✅ Analysis complete:`, analysis);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error in /analyze:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

router.post("/analyze/batch", async (req: Request, res: Response) => {
  try {
    const { claims } = req.body as { claims: string[] };

    if (!Array.isArray(claims) || claims.length === 0) {
      return res.status(400).json({
        error: "Claims array is required",
      });
    }

    if (claims.length > 10) {
      return res.status(400).json({
        error: "Maximum 10 claims per batch",
      });
    }

    console.log(`📝 Analyzing ${claims.length} claims...`);

    const results = await Promise.all(
      claims.map((claim) => geminiService.analyzeClaim(claim))
    );

    console.log(`✅ Batch analysis complete`);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in /analyze/batch:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;