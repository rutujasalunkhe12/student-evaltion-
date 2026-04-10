import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SeedPayload = {
  formStudents?: Array<{
    username?: string;
    name?: string;
    rollNumber?: string;
    batchId?: number;
    department?: string;
  }>;
};

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

const LAST_SEED_PAYLOAD_KEY = "evalportal_last_seed_payload";
const LAST_SEED_RESULT_KEY = "evalportal_last_seed_result";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function downloadTextFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const escaped = String(value ?? "").replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");
}

export default function SeedResultPage() {
  const payload = readJson<SeedPayload>(LAST_SEED_PAYLOAD_KEY);
  const result = readJson<SeedResult>(LAST_SEED_RESULT_KEY);

  const requestedStudents = Array.isArray(payload?.formStudents)
    ? payload!.formStudents
    : [];
  const insertedStudents = Array.isArray(result?.formStudentsInserted)
    ? result!.formStudentsInserted
    : [];
  const insertedBatches = Array.isArray(result?.csvBatchesInserted)
    ? result!.csvBatchesInserted
    : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Seed Result</h1>
            <p className="text-muted-foreground mt-2">
              Review the records sent from Excel/form data and what was inserted.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>{result?.message || "No seed run found yet."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {result?.note && <p className="text-muted-foreground">{result.note}</p>}
            <p>Requested form students: {requestedStudents.length}</p>
            <p>Inserted form students: {insertedStudents.length}</p>
            <p>Inserted CSV batches: {insertedBatches.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Excel/Form Data Sent For Insert</CardTitle>
            <CardDescription>
              These are the records included in the seed request payload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestedStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records were sent in the latest seed request.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadTextFile(
                        "seed-request-form-students.json",
                        JSON.stringify({ formStudents: requestedStudents }, null, 2),
                        "application/json",
                      )
                    }
                  >
                    Download JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rows = [
                        ["name", "rollNumber", "username", "department", "batchId"],
                        ...requestedStudents.map((s) => [
                          s.name || "",
                          s.rollNumber || "",
                          s.username || "",
                          s.department || "",
                          String(s.batchId ?? ""),
                        ]),
                      ];
                      downloadTextFile(
                        "seed-request-form-students.csv",
                        toCsv(rows),
                        "text/csv",
                      );
                    }}
                  >
                    Download CSV
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  {requestedStudents.map((student, idx) => (
                    <div key={`${student.rollNumber || student.username || "student"}-${idx}`} className="rounded-md border p-3">
                      <div>{student.name || "Unnamed Student"}</div>
                      <div className="text-muted-foreground">
                        {student.rollNumber || student.username || "N/A"} | {student.department || "Computer Science"} | Batch {student.batchId || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inserted Students</CardTitle>
            <CardDescription>Students added by the latest seed run.</CardDescription>
          </CardHeader>
          <CardContent>
            {insertedStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students were inserted.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadTextFile(
                        "seed-inserted-students.json",
                        JSON.stringify({ students: insertedStudents }, null, 2),
                        "application/json",
                      )
                    }
                  >
                    Download JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rows = [
                        ["name", "rollNumber", "department", "batchId", "username"],
                        ...insertedStudents.map((s) => [
                          s.name,
                          s.rollNumber,
                          s.department,
                          String(s.batchId),
                          s.username,
                        ]),
                      ];
                      downloadTextFile("seed-inserted-students.csv", toCsv(rows), "text/csv");
                    }}
                  >
                    Download CSV
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  {insertedStudents.map((student) => (
                    <div key={`${student.rollNumber}-${student.batchId}`} className="rounded-md border p-3">
                      <div>{student.name}</div>
                      <div className="text-muted-foreground">
                        {student.rollNumber} | {student.department} | Batch {student.batchId}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inserted CSV Batches</CardTitle>
            <CardDescription>Batches imported and kept by seed.</CardDescription>
          </CardHeader>
          <CardContent>
            {insertedBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No CSV batches were inserted.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadTextFile(
                        "seed-inserted-batches.json",
                        JSON.stringify({ batches: insertedBatches }, null, 2),
                        "application/json",
                      )
                    }
                  >
                    Download JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rows = [
                        ["id", "name", "projectTitle", "projectDescription", "academicYear"],
                        ...insertedBatches.map((b) => [
                          String(b.id),
                          b.name,
                          b.projectTitle,
                          b.projectDescription,
                          b.academicYear,
                        ]),
                      ];
                      downloadTextFile("seed-inserted-batches.csv", toCsv(rows), "text/csv");
                    }}
                  >
                    Download CSV
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  {insertedBatches.map((batch) => (
                    <div key={`${batch.id}-${batch.name}`} className="rounded-md border p-3">
                      <div className="font-medium">{batch.name} - {batch.projectTitle}</div>
                      <div className="text-muted-foreground">{batch.projectDescription}</div>
                      <div className="text-muted-foreground">Academic Year: {batch.academicYear}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
