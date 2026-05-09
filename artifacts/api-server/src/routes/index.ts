import { Router, type IRouter } from "express";
import competitionRunsRouter from "./competition-runs";
import cyclesRouter from "./cycles";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cyclesRouter);
router.use(competitionRunsRouter);

export default router;
