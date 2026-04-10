import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import batchesRouter from "./batches";
import studentsRouter from "./students";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/batches", batchesRouter);
router.use("/students", studentsRouter);
router.use("/seed", seedRouter);

export default router;
