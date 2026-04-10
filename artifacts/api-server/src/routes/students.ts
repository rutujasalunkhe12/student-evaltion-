import { Router, type IRouter } from "express";
import { db, usersTable, evaluationsTable, batchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();
const HR_ALIGNMENT_PENALTY_RATE = 0.25;

function computeFinalScoreFromHrAlignment(
  hrMarks: number | null,
  studentAverageMarks: number | null,
): {
  finalScore: number | null;
  baseAverage: number | null;
  deviationMarks: number | null;
  penaltyMarks: number | null;
} {
  if (hrMarks === null || studentAverageMarks === null) {
    return {
      finalScore: null,
      baseAverage: null,
      deviationMarks: null,
      penaltyMarks: null,
    };
  }

  const baseAverage = (hrMarks + studentAverageMarks) / 2;
  const deviationMarks = Math.abs(hrMarks - studentAverageMarks);
  const penaltyMarks = deviationMarks * HR_ALIGNMENT_PENALTY_RATE;
  const finalScore = Math.max(0, Math.min(100, baseAverage - penaltyMarks));

  return {
    finalScore,
    baseAverage,
    deviationMarks,
    penaltyMarks,
  };
}

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.get("/:studentId/evaluation", requireAuth, async (req, res) => {
  const studentId = parseInt(req.params.studentId);

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, studentId))
    .limit(1);

  if (!student || !student.batchId) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const evalRows = await db
    .select()
    .from(evaluationsTable)
    .where(
      and(
        eq(evaluationsTable.batchId, student.batchId),
        eq(evaluationsTable.studentId, studentId)
      )
    );

  const guideEval = evalRows.find((e) => e.evaluatorType === "guide");
  const peerEvals = evalRows.filter((e) => e.evaluatorType === "peer");

  const guideMarks = guideEval ? guideEval.marks : null;
  const peerAvg =
    peerEvals.length > 0
      ? peerEvals.reduce((sum, e) => sum + e.marks, 0) / peerEvals.length
      : null;

  const scoreBreakdown = computeFinalScoreFromHrAlignment(guideMarks, peerAvg);

  const peerMarksDetails = await Promise.all(
    evalRows.map(async (e) => {
      const [evaluator] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, e.evaluatorId))
        .limit(1);
      return {
        givenByName: evaluator ? evaluator.name : "Unknown",
        marks: e.marks,
        isGuide: e.evaluatorType === "guide",
      };
    })
  );

  res.json({
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber ?? "",
      hrMarks: guideMarks,
      guideMarks,
      peerAvg,
      peerCount: peerEvals.length,
      baseAverage: scoreBreakdown.baseAverage,
      deviationMarks: scoreBreakdown.deviationMarks,
      penaltyMarks: scoreBreakdown.penaltyMarks,
      finalScore: scoreBreakdown.finalScore,
    },
    peerMarks: peerMarksDetails,
    formula:
      "Final Score = ((HR + Student Avg) / 2) - (|HR - Student Avg| x 0.25)",
  });
});

router.post("/add", requireAuth, async (req, res) => {
  const { name, rollNumber, batchId, department, password } = req.body;

  if (!name || !rollNumber || !batchId) {
    res.status(400).json({ error: "name, rollNumber, and batchId are required" });
    return;
  }

  const [batch] = await db
    .select()
    .from(batchesTable)
    .where(eq(batchesTable.id, parseInt(batchId)))
    .limit(1);

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, rollNumber))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Student with this roll number already exists" });
    return;
  }

  const [newStudent] = await db
    .insert(usersTable)
    .values({
      username: rollNumber,
      password: password || "password123",
      name,
      role: "student",
      department: department || "Computer Science",
      rollNumber,
      batchId: parseInt(batchId),
      isFormAdded: true,
    })
    .returning();

  res.json({
    message: "Student added successfully",
    student: {
      id: newStudent.id,
      name: newStudent.name,
      rollNumber: newStudent.rollNumber,
      batchId: newStudent.batchId,
    },
  });
});

router.post("/register", async (req, res) => {
  const { name, password } = req.body;
  const department = req.body?.department || "Computer Science";
  const requestedBatchId = req.body?.batchId;

  if (!name || !password) {
    res.status(400).json({ error: "name and password are required" });
    return;
  }

  let batch;
  if (requestedBatchId) {
    [batch] = await db
      .select()
      .from(batchesTable)
      .where(eq(batchesTable.id, parseInt(requestedBatchId)))
      .limit(1);
  } else {
    [batch] = await db.select().from(batchesTable).limit(1);
  }

  if (!batch) {
    res.status(404).json({ error: "No batch available for registration" });
    return;
  }

  const rollNumber = `REG${Date.now().toString(36).toUpperCase()}`;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, rollNumber))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Student with this roll number already exists" });
    return;
  }

  const [newStudent] = await db
    .insert(usersTable)
    .values({
      username: rollNumber,
      password,
      name,
      role: "student",
      department,
      rollNumber,
      batchId: batch.id,
      isFormAdded: true,
    })
    .returning();

  res.json({
    message: "Student registered successfully",
    student: {
      id: newStudent.id,
      name: newStudent.name,
      rollNumber: newStudent.rollNumber,
      batchId: newStudent.batchId,
    },
  });
});

export default router;
