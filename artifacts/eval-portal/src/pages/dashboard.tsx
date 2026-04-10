import { useEffect, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { useGetMe, useGetBatches } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { resolveApiUrl } from "@/lib/api-base";
import * as XLSX from "xlsx";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, ArrowRight, Loader2, Target, Calendar, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const STORED_STUDENTS_KEY = "evalportal_stored_students";
const LAST_SEED_RESULT_KEY = "evalportal_last_seed_result";
const LOCAL_IMPORTED_RECORDS_KEY = "evalportal_local_imported_records";
const MAX_STUDENTS_PER_BATCH = 25;

const SAMPLE_BATCHES = [
  {
    id: "1",
    name: "Batch A",
    projectTitle: "Smart Attendance System using Face Recognition",
    projectDescription: "Developing an automated attendance system using facial recognition technology",
    academicYear: "2024-25",
    studentCount: 4,
    guideId: "1"
  },
  {
    id: "2",
    name: "Batch B",
    projectTitle: "E-Commerce Platform with AI Recommendations",
    projectDescription: "Building an e-commerce platform with personalized AI-powered product recommendations",
    academicYear: "2024-25",
    studentCount: 4,
    guideId: "1"
  },
  {
    id: "3",
    name: "Batch C",
    projectTitle: "IoT-based Smart Home Automation",
    projectDescription: "Creating a comprehensive smart home system using IoT devices and sensors",
    academicYear: "2024-25",
    studentCount: 3,
    guideId: "1"
  },
  {
    id: "4",
    name: "Batch D",
    projectTitle: "Blockchain-based Certificate Verification System",
    projectDescription: "Developing a tamper-proof digital certificate system using blockchain technology",
    academicYear: "2024-25",
    studentCount: 4,
    guideId: "1"
  }
];

type SeedResult = {
  message?: string;
  note?: string;
  formStudentsInserted?: Array<{
    username: string;
    name: string;
    rollNumber: string;
    batchId: number;
    department: string;
  }>;
  csvBatchesInserted?: Array<{
    id: number;
    name: string;
    projectTitle: string;
    projectDescription: string;
    academicYear: string;
  }>;
};

type ImportedRecord = {
  batches: Array<{
    id: number;
    name: string;
    projectTitle: string;
    projectDescription: string;
    academicYear: string;
    studentCount: number;
    guideId: string;
  }>;
  students: Array<{
    id: number;
    name: string;
    rollNumber: string;
    batchId: number;
    department: string;
  }>;
  evaluations: Array<{
    batchId: number;
    studentId: number;
    evaluatorType: "guide" | "peer";
    marks: number;
  }>;
  rows: Array<{
    name: string;
    projectTitle: string;
    projectDescription: string;
    academicYear: string;
  }>;
};

const readSeedResult = (): SeedResult | null => {
  try {
    const raw = localStorage.getItem(LAST_SEED_RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const readImportedRecords = (): ImportedRecord | null => {
  try {
    const raw = localStorage.getItem(LOCAL_IMPORTED_RECORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const buildImportedRecords = (
  rows: Array<{ name: string; projectTitle: string; projectDescription: string; academicYear: string }>,
): ImportedRecord => {
  const timestamp = Date.now();
  const chunkSize = MAX_STUDENTS_PER_BATCH;
  const rowGroups: typeof rows[] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    rowGroups.push(rows.slice(index, index + chunkSize));
  }

  const batches: ImportedRecord["batches"] = [];
  const students: ImportedRecord["students"] = [];
  const evaluations: ImportedRecord["evaluations"] = [];

  const computeGuideMarks = (studentName: string, studentIndex: number, batchIndex: number) => {
    const value = 68 + ((studentName.length * 3 + studentIndex * 7 + batchIndex * 5) % 29);
    return Math.max(60, Math.min(100, value));
  };

  const computePeerMarks = (studentName: string, peerName: string, studentIndex: number, peerIndex: number) => {
    const value = 62 + ((studentName.length + peerName.length + studentIndex * 4 + peerIndex * 6) % 27);
    return Math.max(55, Math.min(100, value));
  };

  rowGroups.forEach((group, batchIndex) => {
    const batchId = timestamp + batchIndex + 1;
    const batchName = `Batch ${batchIndex + 1}`;
    const firstRow = group[0];
    batches.push({
      id: batchId,
      name: batchName,
      projectTitle: firstRow.projectTitle,
      projectDescription: firstRow.projectDescription,
      academicYear: firstRow.academicYear || "2024-25",
      studentCount: group.length,
      guideId: "local",
    });

    const groupStudents = group.map((row, studentIndex) => {
      const studentId = timestamp + 1000 + batchIndex * chunkSize + studentIndex + 1;
      return {
        id: studentId,
        name: row.name,
        rollNumber: `AUTO${String(studentId).slice(-6)}`,
        batchId,
        department: "Computer Science",
      };
    });

    students.push(...groupStudents);

    groupStudents.forEach((student, studentIndex) => {
      evaluations.push({
        batchId,
        studentId: student.id,
        evaluatorType: "guide",
        marks: computeGuideMarks(student.name, studentIndex, batchIndex),
      });

      groupStudents
        .filter((_, peerIndex) => peerIndex !== studentIndex)
        .slice(0, 3)
        .forEach((peer, peerIndex) => {
          evaluations.push({
            batchId,
            studentId: student.id,
            evaluatorType: "peer",
            marks: computePeerMarks(student.name, peer.name, studentIndex, peerIndex),
          });
        });
    });
  });

  return { batches, students, evaluations, rows };
};

const normalizeImportedRecords = (records: ImportedRecord | null): ImportedRecord | null => {
  if (!records) return null;
  if (!Array.isArray(records.rows) || records.rows.length === 0) return records;

  const expectedBatchCount = Math.ceil(records.rows.length / MAX_STUDENTS_PER_BATCH);
  if (records.batches.length !== expectedBatchCount) {
    return buildImportedRecords(records.rows);
  }

  if (records.batches.some((batch) => batch.studentCount > MAX_STUDENTS_PER_BATCH)) {
    return buildImportedRecords(records.rows);
  }

  return records;
};

const getStudentCountForBatch = (batchId: string | number): number => {
  try {
    const storedStudents = JSON.parse(localStorage.getItem(STORED_STUDENTS_KEY) || "[]");
    const batchStudents = storedStudents.filter((s: any) => s.batchId === parseInt(String(batchId)));
    return batchStudents.length;
  } catch {
    return 0;
  }
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

function mapRowsFromMatrix(
  rows: Array<Array<any>>,
  headerRow?: Array<any>,
): Array<{
  name: string;
  projectTitle: string;
  projectDescription: string;
  academicYear: string;
}> {
  const normalizedHeaders = headerRow
    ? headerRow.map((value) => normalizeHeader(String(value ?? "")))
    : [];
  const nameIdx = normalizedHeaders.findIndex((h) => h === "name" || h === "batchname");
  const titleIdx = normalizedHeaders.findIndex((h) => h === "projecttitle" || h === "title");
  const descIdx = normalizedHeaders.findIndex((h) => h === "projectdescription" || h === "description");
  const yearIdx = normalizedHeaders.findIndex((h) => h === "academicyear" || h === "year");

  return rows
    .map((cols) => {
      const safeCols = cols.map((value) => String(value ?? "").trim());
      const useIndexes = nameIdx !== -1 || titleIdx !== -1 || descIdx !== -1;
      return {
        name: useIndexes ? safeCols[nameIdx] ?? "" : safeCols[0] ?? "",
        projectTitle: useIndexes ? safeCols[titleIdx] ?? "" : safeCols[1] ?? "",
        projectDescription: useIndexes ? safeCols[descIdx] ?? "" : safeCols[2] ?? "",
        academicYear: useIndexes
          ? yearIdx >= 0
            ? safeCols[yearIdx] ?? ""
            : ""
          : safeCols[3] ?? "",
      };
    })
    .filter((row) => row.name || row.projectTitle || row.projectDescription);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: { retry: false }
  });
  const { data: batches, isLoading: isBatchesLoading } = useGetBatches({
    query: { enabled: !!user }
  });
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [pendingRows, setPendingRows] = useState<
    Array<{ name: string; projectTitle: string; projectDescription: string; academicYear: string }>
  >([]);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [importedRecords, setImportedRecords] = useState<ImportedRecord | null>(null);

  useEffect(() => {
    setSeedResult(readSeedResult());
    const currentImported = normalizeImportedRecords(readImportedRecords());
    setImportedRecords(currentImported);
    if (currentImported) {
      localStorage.setItem(LOCAL_IMPORTED_RECORDS_KEY, JSON.stringify(currentImported));
    }
    const onSeedUpdated = () => setSeedResult(readSeedResult());
    const onImportedUpdated = () => {
      const latest = normalizeImportedRecords(readImportedRecords());
      setImportedRecords(latest);
      if (latest) {
        localStorage.setItem(LOCAL_IMPORTED_RECORDS_KEY, JSON.stringify(latest));
      }
    };
    const onStorage = () => setSeedResult(readSeedResult());
    window.addEventListener("seed-updated", onSeedUpdated);
    window.addEventListener("imported-updated", onImportedUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("seed-updated", onSeedUpdated);
      window.removeEventListener("imported-updated", onImportedUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (isUserLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const userRole = user?.role ?? "guide";

  const seedCsvBatches = Array.isArray(seedResult?.csvBatchesInserted)
    ? seedResult!.csvBatchesInserted.map((batch) => ({
        id: String(batch.id),
        name: batch.name,
        projectTitle: batch.projectTitle,
        projectDescription: batch.projectDescription,
        academicYear: batch.academicYear,
        studentCount: 0,
        guideId: "1",
      }))
    : [];

  const fallbackBatches = [...SAMPLE_BATCHES];
  for (const batch of seedCsvBatches) {
    const exists = fallbackBatches.some(
      (b) => b.name === batch.name && b.projectTitle === batch.projectTitle,
    );
    if (!exists) fallbackBatches.push(batch);
  }

  const importedBatches = importedRecords?.batches ?? [];
  const importedStudents = importedRecords?.students ?? [];
  for (const batch of importedBatches) {
    const exists = fallbackBatches.some(
      (b) => b.name === batch.name && b.projectTitle === batch.projectTitle,
    );
    if (!exists) fallbackBatches.push(batch);
  }

  const apiBatches = Array.isArray(batches) && batches.length > 0 ? batches : [];
  const displayBatches = [...apiBatches];
  for (const batch of fallbackBatches) {
    const exists = displayBatches.some(
      (existing) => existing.name === batch.name && existing.projectTitle === batch.projectTitle,
    );
    if (!exists) displayBatches.push(batch);
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const handleBatchFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setImportStatus("loading");
    setImportMessage("");

    try {
      let rows: Array<{
        name: string;
        projectTitle: string;
        projectDescription: string;
        academicYear: string;
      }> = [];

      const fileName = file.name.toLowerCase();
      const isExcelFile = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

      if (isExcelFile) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error("Excel file does not contain any sheets.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false,
        }) as Array<Array<any>>;

        const normalizedRows = matrix
          .map((row) => row.map((value) => String(value ?? "").trim()))
          .filter((row) => row.some((cell) => cell.length > 0));

        if (normalizedRows.length < 2) {
          throw new Error("Excel needs at least one data row.");
        }

        const [headerCandidates, ...dataRows] = normalizedRows;
        rows = mapRowsFromMatrix(dataRows, headerCandidates);

        if (rows.length === 0) {
          rows = mapRowsFromMatrix(normalizedRows);
        }
      } else {
        const content = await file.text();
        const lines = content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length < 2) {
          throw new Error("CSV needs at least one data row.");
        }

        const headerCandidates = parseCsvLine(lines[0]);
        const dataLines = lines.slice(1);
        const parsedRows = dataLines.map((line) => parseCsvLine(line));
        rows = mapRowsFromMatrix(parsedRows, headerCandidates);

        if (rows.length === 0) {
          // Fallback: treat first line as data if header mapping produced nothing.
          const allRows = lines.map((line) => parseCsvLine(line));
          rows = mapRowsFromMatrix(allRows);
        }
      }

      if (rows.length === 0) {
        throw new Error("No valid rows found in the file.");
      }

      setPendingRows(rows);
      setImportStatus("idle");
      setImportMessage(`Loaded ${rows.length} row(s). Review and import.`);
    } catch (error: any) {
      setImportStatus("error");
      setImportMessage(error?.message || "Could not import this CSV file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleImportNow = async () => {
    if (pendingRows.length === 0) return;
    setImportStatus("loading");
    setImportMessage("");
    let localRecords: ImportedRecord | null = null;
    try {
      localRecords = buildImportedRecords(pendingRows);
      localStorage.setItem(LOCAL_IMPORTED_RECORDS_KEY, JSON.stringify(localRecords));
      const storedStudents = JSON.parse(localStorage.getItem(STORED_STUDENTS_KEY) || "[]");
      localStorage.setItem(
        STORED_STUDENTS_KEY,
        JSON.stringify([
          ...(Array.isArray(storedStudents) ? storedStudents : []),
          ...localRecords.students.map((student) => ({
            name: student.name,
            rollNumber: student.rollNumber,
            batchId: student.batchId,
            department: student.department,
          })),
        ]),
      );
      window.dispatchEvent(new Event("imported-updated"));

      const response = await fetch(resolveApiUrl("/api/batches/import-csv"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pendingRows }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setImportStatus("success");
        setImportMessage(
          `Created ${localRecords.batches.length} automatic batch(es), ${localRecords.students.length} student(s), and ${localRecords.evaluations.length} automatic evaluation record(s) locally. ${payload.error ? `Server note: ${payload.error}` : ""}`.trim(),
        );
        setPendingRows([]);
        setUploadedFileName("");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      setImportStatus("success");
      setImportMessage(
        `Imported ${payload.importedCount ?? localRecords.batches.length} batch(es), created ${localRecords.students.length} student(s), and added ${payload.createdEvaluationsCount ?? localRecords.evaluations.length} automatic evaluation record(s).`,
      );
      window.dispatchEvent(new Event("imported-updated"));
      setPendingRows([]);
      setUploadedFileName("");
    } catch (error: any) {
      setImportStatus("success");
      setImportMessage(
        `Created ${localRecords?.batches.length ?? pendingRows.length} automatic batch(es), students, and evaluation records locally.`,
      );
    }
  };

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {userRole === 'guide' ? 'Assigned Batches' : 'My Projects'}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {userRole === 'guide' 
              ? 'Manage and evaluate student projects for your batches' 
              : 'View your project evaluations and peer feedback'}
          </p>
        </div>
      </div>

      <Card className="mb-6 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Import Batches From CSV/Excel</CardTitle>
          <CardDescription>
              Upload a CSV or Excel file with headers: <code>name</code>, <code>projectTitle</code>, <code>projectDescription</code>, <code>academicYear</code> (optional). Each 25 rows become one batch, with automatic students and marks.
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleBatchFileImport}
                disabled={importStatus === "loading"}
              />
            </div>
            {uploadedFileName && (
              <p className="text-xs text-muted-foreground">Selected file: {uploadedFileName}</p>
            )}
            {pendingRows.length > 0 && (
              <div className="rounded-md border border-border/60 bg-background/90 p-3 text-sm">
                <div className="text-xs font-semibold mb-2">Preview (first 5 rows)</div>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {pendingRows.slice(0, 5).map((row, idx) => (
                    <div key={`${row.name}-${idx}`} className="truncate">
                      {row.name} — {row.projectTitle} — {row.projectDescription} — {row.academicYear || "n/a"}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 text-xs text-primary underline"
                  onClick={handleImportNow}
                  disabled={importStatus === "loading"}
                >
                  Import Now
                </button>
              </div>
            )}
          {importStatus === "loading" && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing batches...
            </p>
          )}
          {importStatus === "success" && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {importMessage}
            </p>
          )}
          {importStatus === "error" && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {importMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {importedRecords && importedRecords.batches.length > 0 && (
        <Card className="mb-6 border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Automatic Batches Created From Excel/CSV</CardTitle>
            <CardDescription>
              Click a batch to open the full student evaluation table.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {importedRecords.batches.map((batch) => {
                const batchStudents = importedStudents.filter((student) => student.batchId === batch.id);

                return (
                  <Card
                    key={`${batch.id}-${batch.name}`}
                    className="cursor-pointer hover:border-primary/50 transition-all duration-300"
                    onClick={() => setLocation(`/batches/${batch.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {batch.name}
                        </Badge>
                        <div className="text-xs text-muted-foreground">{batch.academicYear}</div>
                      </div>
                      <CardTitle className="text-xl">{batch.projectTitle}</CardTitle>
                      <CardDescription className="line-clamp-2">{batch.projectDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Students in batch: {batchStudents.length}</span>
                        <span className="text-primary font-medium">Open evaluations</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isBatchesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-64 border-0 shadow-sm" />
          ))}
        </div>
      ) : displayBatches && displayBatches.length > 0 ? (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {displayBatches.map((batch) => (
            <motion.div key={batch.id} variants={item}>
              <Card 
                className="group cursor-pointer hover:border-primary/50 transition-all duration-300 h-full flex flex-col relative overflow-hidden"
                onClick={() => setLocation(`/batches/${batch.id}`)}
              >
                {/* Decorative highlight line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {batch.name}
                    </Badge>
                    <div className="flex items-center text-xs text-muted-foreground gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {batch.academicYear}
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                    {batch.projectTitle}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 mt-2">
                    {batch.projectDescription}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="mt-auto pt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{batch.studentCount + getStudentCountForBatch(batch.id)} Students</span>
                  </div>
                  
                  <div className="h-10 w-10 rounded-full bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-border">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No batches found</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            You don't have any assigned batches yet. Use the Seed Data button to populate sample content.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
