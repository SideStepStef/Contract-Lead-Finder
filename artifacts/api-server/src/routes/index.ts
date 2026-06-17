import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import opportunitiesRouter from "./opportunities";
import remindersRouter from "./reminders";
import notesRouter from "./notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(opportunitiesRouter);
router.use(remindersRouter);
router.use(notesRouter);

export default router;
