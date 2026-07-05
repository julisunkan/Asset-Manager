import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tracksRouter from "./tracks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tracksRouter);

export default router;
