import { Router, type IRouter } from "express";
import { db, isMockDb, usersTable, batchesTable, evaluationsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  if (isMockDb) {
    return res.json({
      message: "Seed completed in mock mode",
      guide: { username: "guide1", password: "password123" },
      note: "SQLite is unavailable, so seed writes were skipped.",
    });
  }

  // Preserve ALL students (including form-added and manually added ones)
  const allStudents = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  const preservedUsersById = new Map<number, typeof allStudents[number]>();
  const preservedUserRollById = new Map<number, string>();
  for (const user of allStudents) {
    preservedUsersById.set(user.id, user);
    const roll = user.rollNumber ?? user.username;
    preservedUserRollById.set(user.id, roll);
  }

  // Preserve ALL evaluations
  const preservedEvaluations = allStudents.length > 0
    ? await db
        .select()
        .from(evaluationsTable)
        .where(inArray(evaluationsTable.studentId, allStudents.map((s) => s.id)))
    : [];

  // Preserve batches imported through dashboard CSV upload
  const csvAddedBatches = await db
    .select()
    .from(batchesTable)
    .where(eq(batchesTable.isCsvAdded, true));

  // Delete all mutable data, then restore preserved records.
  await db.delete(evaluationsTable);
  await db.delete(usersTable).where(eq(usersTable.role, "student"));
  await db.delete(batchesTable);

  const [guide] = await db
    .insert(usersTable)
    .values({
      username: "guide1",
      password: "password123",
      name: "Dr. Priya Sharma",
      role: "guide",
      department: "Computer Science",
      isFormAdded: false,
    })
    .returning();

  const [batchA] = await db
    .insert(batchesTable)
    .values({
      name: "Batch A",
      projectTitle: "Smart Attendance System using Face Recognition",
      projectDescription:
        "Developing an automated attendance system using facial recognition technology",
      academicYear: "2024-25",
      guideId: guide.id,
    })
    .returning();

  const [batchB] = await db
    .insert(batchesTable)
    .values({
      name: "Batch B",
      projectTitle: "E-Commerce Platform with AI Recommendations",
      projectDescription:
        "Building an e-commerce platform with personalized AI-powered product recommendations",
      academicYear: "2024-25",
      guideId: guide.id,
    })
    .returning();

  const [batchC] = await db
    .insert(batchesTable)
    .values({
      name: "Batch C",
      projectTitle: "IoT-based Smart Home Automation",
      projectDescription:
        "Creating a comprehensive smart home system using IoT devices and sensors",
      academicYear: "2024-25",
      guideId: guide.id,
    })
    .returning();

  const [batchD] = await db
    .insert(batchesTable)
    .values({
      name: "Batch D",
      projectTitle: "Blockchain-based Certificate Verification System",
      projectDescription:
        "Developing a tamper-proof digital certificate system using blockchain technology for academic credential verification",
      academicYear: "2024-25",
      guideId: guide.id,
    })
    .returning();

  const preservedCsvBatches =
    csvAddedBatches.length > 0
      ? await db
          .insert(batchesTable)
          .values(
            csvAddedBatches.map((batch) => ({
              name: batch.name,
              projectTitle: batch.projectTitle,
              projectDescription: batch.projectDescription,
              academicYear: batch.academicYear,
              guideId: guide.id,
              isCsvAdded: true,
            })),
          )
          .returning()
      : [];

  const studentsA = await db
    .insert(usersTable)
    .values([
      {
        username: "CS2021001",
        password: "password123",
        name: "Aditya Verma",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021001",
        batchId: batchA.id,
        isFormAdded: false,
      },
      {
        username: "CS2021002",
        password: "password123",
        name: "Sneha Patel",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021002",
        batchId: batchA.id,
        isFormAdded: false,
      },
      {
        username: "CS2021003",
        password: "password123",
        name: "Rohan Mehta",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021003",
        batchId: batchA.id,
        isFormAdded: false,
      },
      {
        username: "CS2021004",
        password: "password123",
        name: "Priya Singh",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021004",
        batchId: batchA.id,
        isFormAdded: false,
      },
    ])
    .returning();

  const studentsB = await db
    .insert(usersTable)
    .values([
      {
        username: "CS2021005",
        password: "password123",
        name: "Rahul Kumar",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021005",
        batchId: batchB.id,
        isFormAdded: false,
      },
      {
        username: "CS2021006",
        password: "password123",
        name: "Ananya Gupta",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021006",
        batchId: batchB.id,
        isFormAdded: false,
      },
      {
        username: "CS2021007",
        password: "password123",
        name: "Vikram Joshi",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021007",
        batchId: batchB.id,
        isFormAdded: false,
      },
      {
        username: "CS2021008",
        password: "password123",
        name: "Kavya Nair",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021008",
        batchId: batchB.id,
        isFormAdded: false,
      },
    ])
    .returning();

  const studentsC = await db
    .insert(usersTable)
    .values([
      {
        username: "CS2021009",
        password: "password123",
        name: "Arjun Reddy",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021009",
        batchId: batchC.id,
        isFormAdded: false,
      },
      {
        username: "CS2021010",
        password: "password123",
        name: "Divya Menon",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021010",
        batchId: batchC.id,
        isFormAdded: false,
      },
      {
        username: "CS2021011",
        password: "password123",
        name: "Karan Shah",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021011",
        batchId: batchC.id,
        isFormAdded: false,
      },
    ])
    .returning();

  const studentsD = await db
    .insert(usersTable)
    .values([
      {
        username: "CS2021012",
        password: "password123",
        name: "Neha Sharma",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021012",
        batchId: batchD.id,
        isFormAdded: false,
      },
      {
        username: "CS2021013",
        password: "password123",
        name: "Amit Tiwari",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021013",
        batchId: batchD.id,
        isFormAdded: false,
      },
      {
        username: "CS2021014",
        password: "password123",
        name: "Pooja Rao",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021014",
        batchId: batchD.id,
        isFormAdded: false,
      },
      {
        username: "CS2021015",
        password: "password123",
        name: "Siddharth Nair",
        role: "student" as const,
        department: "Computer Science",
        rollNumber: "CS2021015",
        batchId: batchD.id,
        isFormAdded: false,
      },
    ])
    .returning();

  const guideMarksA = [56, 88, 75, 91];
  const peerSetsA = [
    [80, 82, 81],
    [86, 88, 87],
    [71, 74, 73],
    [89, 91, 89],
  ];
  for (let i = 0; i < studentsA.length; i++) {
    await db.insert(evaluationsTable).values({
      batchId: batchA.id,
      studentId: studentsA[i].id,
      evaluatorId: guide.id,
      evaluatorType: "guide",
      marks: guideMarksA[i],
    });
    const peers = studentsA.filter((_, idx) => idx !== i);
    for (let j = 0; j < peers.length; j++) {
      await db.insert(evaluationsTable).values({
        batchId: batchA.id,
        studentId: studentsA[i].id,
        evaluatorId: peers[j].id,
        evaluatorType: "peer",
        marks: peerSetsA[i][j],
      });
    }
  }

  const guideMarksB = [72, 85, 68, 90];
  const peerSetsB = [
    [70, 74, 71],
    [84, 86, 85],
    [65, 70, 67],
    [88, 91, 90],
  ];
  for (let i = 0; i < studentsB.length; i++) {
    await db.insert(evaluationsTable).values({
      batchId: batchB.id,
      studentId: studentsB[i].id,
      evaluatorId: guide.id,
      evaluatorType: "guide",
      marks: guideMarksB[i],
    });
    const peers = studentsB.filter((_, idx) => idx !== i);
    for (let j = 0; j < peers.length; j++) {
      await db.insert(evaluationsTable).values({
        batchId: batchB.id,
        studentId: studentsB[i].id,
        evaluatorId: peers[j].id,
        evaluatorType: "peer",
        marks: peerSetsB[i][j],
      });
    }
  }

  const guideMarksC = [80, 74, 92];
  const peerSetsC = [[78, 82], [72, 75], [90, 93]];
  for (let i = 0; i < studentsC.length; i++) {
    await db.insert(evaluationsTable).values({
      batchId: batchC.id,
      studentId: studentsC[i].id,
      evaluatorId: guide.id,
      evaluatorType: "guide",
      marks: guideMarksC[i],
    });
    const peers = studentsC.filter((_, idx) => idx !== i);
    for (let j = 0; j < peers.length; j++) {
      await db.insert(evaluationsTable).values({
        batchId: batchC.id,
        studentId: studentsC[i].id,
        evaluatorId: peers[j].id,
        evaluatorType: "peer",
        marks: peerSetsC[i][j],
      });
    }
  }

  const guideMarksD = [82, 67, 88, 73];
  const peerSetsD = [
    [80, 84, 79],
    [65, 70, 68],
    [87, 90, 88],
    [72, 75, 74],
  ];
  for (let i = 0; i < studentsD.length; i++) {
    await db.insert(evaluationsTable).values({
      batchId: batchD.id,
      studentId: studentsD[i].id,
      evaluatorId: guide.id,
      evaluatorType: "guide",
      marks: guideMarksD[i],
    });
    const peers = studentsD.filter((_, idx) => idx !== i);
    for (let j = 0; j < peers.length; j++) {
      await db.insert(evaluationsTable).values({
        batchId: batchD.id,
        studentId: studentsD[i].id,
        evaluatorId: peers[j].id,
        evaluatorType: "peer",
        marks: peerSetsD[i][j],
      });
    }
  }

  // Reassign any preserved students to the correct batch
  const allBatches = [batchA, batchB, batchC, batchD, ...preservedCsvBatches];
  const seenUsernames = new Set<string>();
  const insertedPreservedStudents: Array<{
    username: string;
    name: string;
    rollNumber: string;
    batchId: number;
    department: string;
  }> = [];

  for (const student of allStudents) {
    const username = String(student.username ?? "").trim();
    if (!username || seenUsernames.has(username)) continue;
    seenUsernames.add(username);

    // Try to assign to a batch. If original batch ID is valid, use it; otherwise use first batch
    const targetBatchId =
      student.batchId && Number.isFinite(Number(student.batchId))
        ? Number(student.batchId)
        : allBatches[0].id;
    const targetBatch =
      allBatches.find((b) => b.id === targetBatchId) || allBatches[0];

    try {
      await db.insert(usersTable).values({
        username,
        password: String(student.password ?? "password123"),
        name: String(student.name ?? "Unnamed Student"),
        role: "student" as const,
        department: String(student.department ?? "Computer Science"),
        rollNumber: String(student.rollNumber ?? username),
        batchId: targetBatch.id,
        isFormAdded: student.isFormAdded,
      });
      insertedPreservedStudents.push({
        username,
        name: String(student.name ?? "Unnamed Student"),
        rollNumber: String(student.rollNumber ?? username),
        batchId: targetBatch.id,
        department: String(student.department ?? "Computer Science"),
      });
    } catch {
      // Skip if username collision
    }
  }

  const allUsersAfterSeed = await db.select().from(usersTable);
  const usernameToUserId = new Map<string, number>();
  
  for (const user of allUsersAfterSeed) {
    usernameToUserId.set(user.username, user.id);
    if (user.rollNumber) {
      usernameToUserId.set(user.rollNumber, user.id);
    }
  }

  // Restore all preserved evaluations
  if (preservedEvaluations.length > 0) {
    for (const evalRow of preservedEvaluations) {
      const originalStudent = allStudents.find((s) => s.id === evalRow.studentId);
      const restoredStudent = allUsersAfterSeed.find((u) => u.username === originalStudent?.username);
      
      if (!restoredStudent || !restoredStudent.batchId) continue;

      const originalEvaluator = allStudents.find((s) => s.id === evalRow.evaluatorId);
      const restoredEvaluator = allUsersAfterSeed.find(
        (u) => originalEvaluator ? u.username === originalEvaluator.username : u.id === guide.id
      ) || guide;

      if (!restoredEvaluator) continue;

      try {
        await db.insert(evaluationsTable).values({
          batchId: restoredStudent.batchId,
          studentId: restoredStudent.id,
          evaluatorId: restoredEvaluator.id,
          evaluatorType: evalRow.evaluatorType,
          marks: evalRow.marks,
        });
      } catch {
        // Skip if duplicate
      }
    }
  }

  res.json({
    message: "Sample data seeded successfully + all student data preserved",
    studentsPreserved: allStudents.length,
    studentsRestored: insertedPreservedStudents.length,
    evaluationsPreserved: preservedEvaluations.length,
    csvBatchesPreserved: preservedCsvBatches.length,
    csvBatchesInserted: preservedCsvBatches.map((batch) => ({
      id: batch.id,
      name: batch.name,
      projectTitle: batch.projectTitle,
      projectDescription: batch.projectDescription,
      academicYear: batch.academicYear,
    })),
  });
});

export default router;
