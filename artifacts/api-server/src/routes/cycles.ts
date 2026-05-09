import { Router, type IRouter } from "express";
import {
  CycleDetailResponse,
  CycleDirectoryResponse,
  CycleQuotaSummaryResponse,
} from "@workspace/api-zod";

import { getCycleDetail, getCycleDirectory, getCycleQuotas, RunNotFoundError } from "../lib/competition-runs";

const router: IRouter = Router();

router.get("/cycles", async (_req, res, next) => {
  try {
    const payload = await getCycleDirectory();
    res.json(CycleDirectoryResponse.parse(payload));
  } catch (error) {
    next(error);
  }
});

router.get("/cycles/:cycleId", async (req, res, next) => {
  try {
    const cycleRunId =
      typeof req.query.cycleRunId === "string" ? req.query.cycleRunId : null;
    const payload = await getCycleDetail(req.params.cycleId, cycleRunId);
    res.json(CycleDetailResponse.parse(payload));
  } catch (error) {
    if (error instanceof RunNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
});

router.get("/cycles/:cycleId/quotas", async (req, res, next) => {
  try {
    const cycleRunId =
      typeof req.query.cycleRunId === "string" ? req.query.cycleRunId : null;
    const payload = await getCycleQuotas(req.params.cycleId, cycleRunId);
    res.json(CycleQuotaSummaryResponse.parse(payload));
  } catch (error) {
    next(error);
  }
});

export default router;
