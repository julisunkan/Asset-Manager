import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tracksRouter from "./tracks";
import settingsRouter from "./settings";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tracksRouter);
router.use(settingsRouter);
router.use(integrationsRouter);

export default router;
