import { Router, type IRouter } from "express";
import {
  CompetitionRunResponse,
  SaveCompetitionSnapshotResponse,
} from "@workspace/api-zod";

import {
  createCompetitionRun,
  getCompetitionRun,
  RunNotFoundError,
  saveCompetitionSnapshot,
  SnapshotConflictError,
} from "../lib/competition-runs";

const router: IRouter = Router();

router.post("/competition-runs", async (req, res, next) => {
  try {
    const payload = await createCompetitionRun(req.body);
    res.status(201).json(CompetitionRunResponse.parse(payload));
  } catch (error) {
    next(error);
  }
});

router.get("/competition-runs/:runId", async (req, res, next) => {
  try {
    const payload = await getCompetitionRun(req.params.runId);
    res.json(CompetitionRunResponse.parse(payload));
  } catch (error) {
    if (error instanceof RunNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
});

router.put("/competition-runs/:runId/snapshot", async (req, res, next) => {
  try {
    const payload = await saveCompetitionSnapshot(req.params.runId, req.body);
    res.json(SaveCompetitionSnapshotResponse.parse(payload));
  } catch (error) {
    if (error instanceof RunNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    if (error instanceof SnapshotConflictError) {
      res.status(409).json({ message: error.message });
      return;
    }

    next(error);
  }
});

export default router;
