import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import opportunitiesRouter from "./opportunities";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(opportunitiesRouter);

export default router;
