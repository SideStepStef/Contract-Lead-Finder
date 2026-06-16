import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import opportunitiesRouter from "./opportunities";
import remindersRouter from "./reminders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(opportunitiesRouter);
router.use(remindersRouter);

export default router;
