import { Router, type IRouter } from "express";
import { db, batchesTable, usersTable, evaluationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const MAX_STUDENTS_PER_BATCH = 25;
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

function chunkRows<T>(rows: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  return chunks;
}

function computeGuideMarks(studentName: string, studentIndex: number, batchIndex: number): number {
  const value = 68 + ((studentName.length * 3 + studentIndex * 7 + batchIndex * 5) % 29);
  return Math.max(60, Math.min(100, value));
}

function computePeerMarks(studentName: string, peerName: string, studentIndex: number, peerIndex: number): number {
  const value = 62 + ((studentName.length + peerName.length + studentIndex * 4 + peerIndex * 6) % 27);
  return Math.max(55, Math.min(100, value));
}

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.get("/public", async (_req, res) => {
  const batches = await db.select().from(batchesTable);
  res.json(
    batches.map((batch) => ({
      id: batch.id,
      name: batch.name,
      projectTitle: batch.projectTitle,
      academicYear: batch.academicYear,
    })),
  );
});

router.get("/", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  let batches;
  if (user.role === "guide") {
    batches = await db
      .select()
      .from(batchesTable)
      .where(eq(batchesTable.guideId, userId));
  } else {
    if (!user.batchId) {
      res.json([]);
      return;
    }
    batches = await db
      .select()
      .from(batchesTable)
      .where(eq(batchesTable.id, user.batchId));
  }

  const batchesWithCount = await Promise.all(
    batches.map(async (batch) => {
      const students = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.batchId, batch.id), eq(usersTable.role, "student")));
      return {
        id: batch.id,
        name: batch.name,
        projectTitle: batch.projectTitle,
        projectDescription: batch.projectDescription,
        studentCount: students.length,
        academicYear: batch.academicYear,
      };
    })
  );

  res.json(batchesWithCount);
});

router.get("/:batchId", requireAuth, async (req, res) => {
  const batchId = parseInt(req.params.batchId);

  const [batch] = await db
    .select()
    .from(batchesTable)
    .where(eq(batchesTable.id, batchId))
    .limit(1);

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  const students = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.batchId, batchId), eq(usersTable.role, "student")));

  const studentScores = await Promise.all(
    students.map(async (student) => {
      const evalRows = await db
        .select()
        .from(evaluationsTable)
        .where(and(
          eq(evaluationsTable.batchId, batchId),
          eq(evaluationsTable.studentId, student.id)
        ));

      const guideEval = evalRows.find((e) => e.evaluatorType === "guide");
      const peerEvals = evalRows.filter((e) => e.evaluatorType === "peer");

      const guideMarks = guideEval ? guideEval.marks : null;
      const peerAvg =
        peerEvals.length > 0
          ? peerEvals.reduce((sum, e) => sum + e.marks, 0) / peerEvals.length
          : null;

      const scoreBreakdown = computeFinalScoreFromHrAlignment(guideMarks, peerAvg);

      return {
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
      };
    })
  );

  res.json({
    id: batch.id,
    name: batch.name,
    projectTitle: batch.projectTitle,
    projectDescription: batch.projectDescription,
    academicYear: batch.academicYear,
    students: studentScores,
  });
});

router.post("/import-csv", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (user.role !== "guide") {
    res.status(403).json({ error: "Only guides can import batches" });
    return;
  }

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) {
    res.status(400).json({ error: "No CSV rows were provided" });
    return;
  }

  const normalizedRows = rows
    .map((row: any) => ({
      name: String(row?.name ?? "").trim(),
      projectTitle: String(row?.projectTitle ?? "").trim(),
      projectDescription: String(row?.projectDescription ?? "").trim(),
      academicYear: String(row?.academicYear ?? "").trim() || "2024-25",
    }))
    .filter(
      (row: any) =>
        row.name.length > 0 &&
        row.projectTitle.length > 0 &&
        row.projectDescription.length > 0,
    );

  if (normalizedRows.length === 0) {
    res.status(400).json({
      error:
        "No valid rows found. Required columns: name, projectTitle, projectDescription",
    });
    return;
  }

  const rowGroups = chunkRows(normalizedRows, MAX_STUDENTS_PER_BATCH);
  const createdBatches: Array<{
    id: number;
    name: string;
    projectTitle: string;
    projectDescription: string;
    academicYear: string;
  }> = [];
  const createdStudents: Array<{
    id: number;
    name: string;
    rollNumber: string;
    batchId: number;
    department: string;
  }> = [];
  let createdEvaluationsCount = 0;

  for (let batchIndex = 0; batchIndex < rowGroups.length; batchIndex++) {
    const group = rowGroups[batchIndex];
    const firstRow = group[0];
    const [createdBatch] = await db
      .insert(batchesTable)
      .values({
        name: `Batch ${batchIndex + 1}`,
        projectTitle: firstRow.projectTitle,
        projectDescription: firstRow.projectDescription,
        academicYear: firstRow.academicYear,
        guideId: userId,
        isCsvAdded: true,
      })
      .returning();

    createdBatches.push({
      id: createdBatch.id,
      name: createdBatch.name,
      projectTitle: createdBatch.projectTitle,
      projectDescription: createdBatch.projectDescription,
      academicYear: createdBatch.academicYear,
    });

    const insertedStudents = await db
      .insert(usersTable)
      .values(
        group.map((row: any, studentIndex: number) => ({
          username: `${row.name.replace(/\s+/g, "").toUpperCase()}_${batchIndex + 1}_${studentIndex + 1}`,
          password: "password123",
          name: row.name,
          role: "student",
          department: "Computer Science",
          rollNumber: `AUTO${String(createdBatch.id).padStart(2, "0")}${String(studentIndex + 1).padStart(2, "0")}`,
          batchId: createdBatch.id,
          isFormAdded: false,
        })),
      )
      .returning();

    createdStudents.push(
      ...insertedStudents.map((student) => ({
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber ?? student.username,
        batchId: createdBatch.id,
        department: student.department,
      })),
    );

    for (let studentIndex = 0; studentIndex < insertedStudents.length; studentIndex++) {
      const student = insertedStudents[studentIndex];
      await db.insert(evaluationsTable).values({
        batchId: createdBatch.id,
        studentId: student.id,
        evaluatorId: userId,
        evaluatorType: "guide",
        marks: computeGuideMarks(student.name, studentIndex, batchIndex),
      });
      createdEvaluationsCount += 1;

      const peerSources = insertedStudents.filter((_, peerIndex) => peerIndex !== studentIndex).slice(0, 3);
      for (let peerIndex = 0; peerIndex < peerSources.length; peerIndex++) {
        const peer = peerSources[peerIndex];
        await db.insert(evaluationsTable).values({
          batchId: createdBatch.id,
          studentId: student.id,
          evaluatorId: peer.id,
          evaluatorType: "peer",
          marks: computePeerMarks(student.name, peer.name, studentIndex, peerIndex),
        });
        createdEvaluationsCount += 1;
      }
    }
  }

  res.json({
    message: "Batches imported successfully",
    importedCount: createdBatches.length,
    batchSizeLimit: MAX_STUDENTS_PER_BATCH,
    createdBatches,
    createdStudents,
    createdEvaluationsCount,
  });
});

router.post("/:batchId/evaluate", requireAuth, async (req, res) => {
  const batchId = parseInt(req.params.batchId);
  const userId = (req.session as any).userId;
  const { studentId, marks } = req.body;

  if (marks < 0 || marks > 100) {
    res.status(400).json({ error: "Marks must be between 0 and 100" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (user.role !== "guide") {
    res.status(403).json({ error: "Only guides can edit marks" });
    return;
  }

  const [batch] = await db
    .select()
    .from(batchesTable)
    .where(eq(batchesTable.id, batchId))
    .limit(1);

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  if (batch.guideId !== userId) {
    res.status(403).json({ error: "You can only edit marks for your own batches" });
    return;
  }

  const existing = await db
    .select()
    .from(evaluationsTable)
    .where(
      and(
        eq(evaluationsTable.batchId, batchId),
        eq(evaluationsTable.studentId, studentId),
        eq(evaluationsTable.evaluatorId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(evaluationsTable)
      .set({ marks, evaluatorType: "guide" })
      .where(
        and(
          eq(evaluationsTable.batchId, batchId),
          eq(evaluationsTable.studentId, studentId),
          eq(evaluationsTable.evaluatorId, userId)
        )
      );
  } else {
    await db.insert(evaluationsTable).values({
      batchId,
      studentId,
      evaluatorId: userId,
      evaluatorType: "guide",
      marks,
    });
  }

  res.json({ message: "Evaluation submitted" });
});

export default router;
