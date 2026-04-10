import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetBatch, useGetStudentEvaluation, useEvaluateStudent, useGetMe } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Calculator,
  Loader2,
  FileText,
  Download,
  Save,
} from "lucide-react";

const SAMPLE_BATCH = {
  id: 1,
  name: "Batch A",
  academicYear: "2024-25",
  projectTitle: "Student Evaluations",
  projectDescription: "",
  students: [
    {
      id: 1,
      name: "Aditya Verma",
      rollNumber: "CS2021001",
      guideMarks: 56,
      peerAvg: 81.0,
      peerCount: 3,
      finalScore: 112.0,
    },
    {
      id: 2,
      name: "Sneha Patel",
      rollNumber: "CS2021002",
      guideMarks: 88,
      peerAvg: 87.0,
      peerCount: 3,
      finalScore: 174.0,
    },
    {
      id: 3,
      name: "Rohan Mehta",
      rollNumber: "CS2021003",
      guideMarks: 75,
      peerAvg: 72.7,
      peerCount: 3,
      finalScore: 145.3,
    },
    {
      id: 4,
      name: "Priya Singh",
      rollNumber: "CS2021004",
      guideMarks: 91,
      peerAvg: 89.7,
      peerCount: 3,
      finalScore: 179.3,
    },
  ],
};

const STORED_STUDENTS_KEY = "evalportal_stored_students";
const LOCAL_IMPORTED_RECORDS_KEY = "evalportal_local_imported_records";
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
  if (hrMarks == null || studentAverageMarks == null) {
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

export default function BatchDetail() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const batchId = parseInt(id || "0", 10);

  const { data: user } = useGetMe();
  const canEditMarks = user?.role === "guide";
  const { data: batch, isLoading: isBatchLoading } = useGetBatch(batchId, {
    query: { enabled: !!batchId },
  });

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [evalModalStudentId, setEvalModalStudentId] = useState<number | null>(null);

  let importedRecords: any = null;
  try {
    importedRecords = JSON.parse(localStorage.getItem(LOCAL_IMPORTED_RECORDS_KEY) || "null");
  } catch {
    importedRecords = null;
  }

  const importedBatch = Array.isArray(importedRecords?.batches)
    ? importedRecords.batches.find((item: any) => item.id === batchId)
    : null;
  const importedStudentsForBatch = Array.isArray(importedRecords?.students)
    ? importedRecords.students.filter((item: any) => item.batchId === batchId)
    : [];
  const importedEvaluationsForBatch = Array.isArray(importedRecords?.evaluations)
    ? importedRecords.evaluations.filter((item: any) => item.batchId === batchId)
    : [];

  const importedStudentScores = importedStudentsForBatch.map((student: any) => {
    const guideEval = importedEvaluationsForBatch.find(
      (evalRow: any) => evalRow.studentId === student.id && evalRow.evaluatorType === "guide",
    );
    const peerEvals = importedEvaluationsForBatch.filter(
      (evalRow: any) => evalRow.studentId === student.id && evalRow.evaluatorType === "peer",
    );

    const guideMarks = guideEval ? guideEval.marks : null;
    const peerAvg =
      peerEvals.length > 0
        ? peerEvals.reduce((sum: number, evalRow: any) => sum + evalRow.marks, 0) / peerEvals.length
        : null;
    const finalScore = computeFinalScoreFromHrAlignment(guideMarks, peerAvg).finalScore;

    return {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      guideMarks,
      peerAvg,
      peerCount: peerEvals.length,
      finalScore,
    };
  });

  const fallbackBatch = SAMPLE_BATCH;
  const displayBatch = importedBatch
    ? {
        id: importedBatch.id,
        name: importedBatch.name,
        academicYear: importedBatch.academicYear,
        projectTitle: importedBatch.projectTitle,
        projectDescription: importedBatch.projectDescription,
        students: importedStudentScores,
      }
    : batch && Array.isArray(batch.students) && batch.students.length > 0
    ? batch
    : fallbackBatch;

  let localStudents: Array<{
    id: string | number;
    name: string;
    rollNumber: string;
    guideMarks: number | null;
    peerAvg: number | null;
    peerCount: number;
    finalScore: number | null;
  }> = [];

  try {
    const storedStudents = JSON.parse(localStorage.getItem(STORED_STUDENTS_KEY) || "[]");
    localStudents = importedBatch
      ? []
      : storedStudents
          .filter((student: { batchId: number }) => student.batchId === batchId)
          .map((student: { id: string | number; name: string; rollNumber: string }) => ({
            id: student.id,
            name: student.name,
            rollNumber: student.rollNumber,
            guideMarks: null,
            peerAvg: null,
            peerCount: 0,
            finalScore: null,
          }));
  } catch {
    localStudents = [];
  }

  const baseStudents = Array.isArray(displayBatch?.students) ? displayBatch.students : [];
  const students = [...baseStudents, ...localStudents];

  if (isBatchLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!displayBatch) {
    return (
      <AppLayout>
        <div className="text-center py-20">Batch not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Student Evaluations
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Students Table */}
      <Card className="overflow-hidden border-0 shadow-xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-slate-50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold text-center">HR/Guide Marks (100)</th>
                <th className="px-6 py-4 font-semibold text-center">Peer Avg (100)</th>
                <th className="px-6 py-4 font-semibold text-center">Final Score</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {students.map((student) => {
                const isTemporaryLocalStudent = !importedBatch && typeof student.id === "string";
                const hasGuideMarks = student.guideMarks != null;
                const hasPeerMarks = student.peerCount > 0;
                const hasFinal = student.finalScore != null;

                const finalScore = student.finalScore ?? 0;
                const scoreColor =
                  hasFinal && finalScore >= 150
                    ? "bg-green-100 text-green-800"
                    : hasFinal && finalScore >= 100
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800";

                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student Name + Roll */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-foreground text-base">{student.name}</div>
                        {isTemporaryLocalStudent && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            Local
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{student.rollNumber}</div>
                    </td>

                    {/* Guide Marks — circle badge */}
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full border-2 border-slate-200 bg-white font-bold text-slate-700 text-base shadow-sm">
                        {hasGuideMarks ? student.guideMarks : <span className="text-muted-foreground text-xs">—</span>}
                      </span>
                    </td>

                    {/* Peer Avg + peer count */}
                    <td className="px-6 py-5 text-center">
                      {hasPeerMarks ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-semibold text-slate-700 text-base">{student.peerAvg?.toFixed(1)}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {student.peerCount} Peers
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">No evals</span>
                      )}
                    </td>

                    {/* Final Score — colored pill */}
                    <td className="px-6 py-5 text-center">
                      {hasFinal ? (
                        <span className={`inline-block px-4 py-1.5 rounded-full font-bold text-base ${scoreColor}`}>
                          {student.finalScore?.toFixed(1)}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal">Incomplete</Badge>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isTemporaryLocalStudent ? (
                          <span className="text-xs text-muted-foreground">
                            Saved locally
                          </span>
                        ) : (
                          <>
                            {!importedBatch && (
                              <button
                                onClick={() => setSelectedStudentId(student.id)}
                                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary transition-colors font-medium"
                              >
                                <FileText className="h-4 w-4" />
                                Details
                              </button>
                            )}

                            <Button
                              size="sm"
                              disabled={!canEditMarks}
                              onClick={() => setEvalModalStudentId(student.id)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 ml-2"
                            >
                              <Calculator className="h-3.5 w-3.5" />
                              {canEditMarks ? "Evaluate" : "Guide Only"}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {selectedStudentId && (
        <StudentDetailsModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}

      {evalModalStudentId && (
        <EvaluateModal
          batchId={batchId}
          studentId={evalModalStudentId}
          importedBatch={!!importedBatch}
          isGuide={canEditMarks}
          onClose={() => setEvalModalStudentId(null)}
          onSuccess={() => {
            setEvalModalStudentId(null);
          }}
        />
      )}
    </AppLayout>
  );
}

function StudentDetailsModal({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const { data: details, isLoading } = useGetStudentEvaluation(studentId);

  const handleDownload = () => {
    if (!details) return;
    const lines = [
      `Student Evaluation Report`,
      `========================`,
      `Name: ${details.student.name}`,
      `Roll Number: ${details.student.rollNumber}`,
      ``,
      `HR/Guide Marks: ${details.student.guideMarks ?? "Pending"}`,
      `Peer Average: ${details.student.peerAvg != null ? details.student.peerAvg.toFixed(1) : "No evals"}`,
      `Final Score: ${details.student.finalScore != null ? details.student.finalScore.toFixed(1) : "Incomplete"}`,
      ``,
      `Formula: ${details.formula}`,
      ``,
      `Individual Evaluations:`,
      ...details.peerMarks.map(
        (m) => `  ${m.isGuide ? "[Guide]" : "[Peer] "} ${m.givenByName}: ${m.marks}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${details.student.rollNumber}_evaluation.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Evaluation Details</DialogTitle>
        {details && (
          <DialogDescription>
            {details.student.name} ({details.student.rollNumber})
          </DialogDescription>
        )}
      </DialogHeader>

      <div className="mt-4">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
          </div>
        ) : details ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <div className="text-xs text-blue-500 font-semibold uppercase mb-1">HR/Guide</div>
                <div className="text-2xl font-bold text-blue-800">{details.student.guideMarks ?? "—"}</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <div className="text-xs text-purple-500 font-semibold uppercase mb-1">Peer Avg</div>
                <div className="text-2xl font-bold text-purple-800">
                  {details.student.peerAvg != null ? details.student.peerAvg.toFixed(1) : "—"}
                </div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <div className="text-xs text-green-500 font-semibold uppercase mb-1">Final</div>
                <div className="text-2xl font-bold text-green-800">
                  {details.student.finalScore != null ? details.student.finalScore.toFixed(1) : "—"}
                </div>
              </div>
            </div>

            {details.student.guideMarks != null && details.student.peerAvg != null && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-sm text-slate-700">
                Final = (({details.student.guideMarks} + {details.student.peerAvg.toFixed(1)}) / 2) - (|{details.student.guideMarks} - {details.student.peerAvg.toFixed(1)}| x {HR_ALIGNMENT_PENALTY_RATE}){" "}
                = <strong className="text-green-700">{details.student.finalScore?.toFixed(1)}</strong>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-500 mb-3">Individual Evaluations</h4>
              {details.peerMarks.length > 0 ? (
                <div className="space-y-2">
                  {details.peerMarks.map((mark, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2">
                        {mark.isGuide ? (
                          <Badge className="text-[10px] uppercase bg-primary text-primary-foreground">Guide</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] uppercase">Peer</Badge>
                        )}
                        <span className="font-medium text-sm text-slate-700">{mark.givenByName}</span>
                      </div>
                      <span className="font-bold text-slate-900">{mark.marks} / 100</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic p-4 text-center bg-slate-50 rounded-lg">
                  No evaluations submitted yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-destructive">Failed to load details</div>
        )}
      </div>
    </Dialog>
  );
}

function EvaluateModal({
  batchId,
  studentId,
  importedBatch,
  isGuide,
  onClose,
  onSuccess,
}: {
  batchId: number;
  studentId: number;
  importedBatch: boolean;
  isGuide: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [marks, setMarks] = useState<string>("");
  const queryClient = useQueryClient();
  const { mutate, isPending } = useEvaluateStudent();
  let importedRecords: any = null;
  try {
    importedRecords = JSON.parse(localStorage.getItem(LOCAL_IMPORTED_RECORDS_KEY) || "null");
  } catch {
    importedRecords = null;
  }

  const importedStudent = importedBatch && Array.isArray(importedRecords?.students)
    ? importedRecords.students.find((student: any) => student.id === studentId)
    : null;
  const importedEvaluations = importedBatch && Array.isArray(importedRecords?.evaluations)
    ? importedRecords.evaluations.filter((item: any) => item.batchId === batchId && item.studentId === studentId)
    : [];

  const importedGuide = importedEvaluations.find((item: any) => item.evaluatorType === "guide")?.marks ?? null;
  const importedPeerValues = importedEvaluations
    .filter((item: any) => item.evaluatorType === "peer")
    .map((item: any) => item.marks);
  const importedPeerAvg = importedPeerValues.length > 0
    ? importedPeerValues.reduce((sum: number, value: number) => sum + value, 0) / importedPeerValues.length
    : null;
  const importedFinal = computeFinalScoreFromHrAlignment(importedGuide, importedPeerAvg).finalScore;

  const localStudentDetails = importedStudent
    ? {
        student: {
          id: studentId,
          name: importedStudent.name,
          rollNumber: importedStudent.rollNumber,
          guideMarks: importedGuide,
          peerAvg: importedPeerAvg,
          peerCount: importedPeerValues.length,
          finalScore: importedFinal,
        },
      }
    : null;

  const { data: studentDetails } = useGetStudentEvaluation(studentId, {
    query: { enabled: !importedStudent },
  });
  const effectiveStudentDetails = localStudentDetails ?? studentDetails;

  const currentGuide = effectiveStudentDetails?.student?.guideMarks ?? null;
  const currentPeerAvg = effectiveStudentDetails?.student?.peerAvg ?? null;

  const marksNum = parseFloat(marks);
  const previewGuide = isGuide ? (isNaN(marksNum) ? null : marksNum) : currentGuide;
  const previewPeer = currentPeerAvg;

  const liveScore =
    computeFinalScoreFromHrAlignment(previewGuide, previewPeer).finalScore;

  useEffect(() => {
    if (effectiveStudentDetails) {
      if (isGuide && effectiveStudentDetails.student.guideMarks != null) {
        setMarks(effectiveStudentDetails.student.guideMarks.toString());
      }
    }
  }, [effectiveStudentDetails, isGuide]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGuide) return;

    const numMarks = parseFloat(marks);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) return;

    if (importedStudent && importedRecords) {
      const list = Array.isArray(importedRecords.evaluations)
        ? [...importedRecords.evaluations]
        : [];

      if (isGuide) {
        const existingGuideIndex = list.findIndex(
          (item: any) =>
            item.batchId === batchId &&
            item.studentId === studentId &&
            item.evaluatorType === "guide",
        );
        if (existingGuideIndex >= 0) {
          list[existingGuideIndex] = {
            ...list[existingGuideIndex],
            marks: numMarks,
          };
        } else {
          list.push({ batchId, studentId, evaluatorType: "guide", marks: numMarks });
        }
      }

      const updated = { ...importedRecords, evaluations: list };
      localStorage.setItem(LOCAL_IMPORTED_RECORDS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("imported-updated"));
      onSuccess();
      return;
    }

    mutate(
      {
        batchId,
        data: {
          studentId,
          marks: numMarks,
          evaluatorType: "guide",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/batches/${batchId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/evaluation`] });
          onSuccess();
        },
      }
    );
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>
          {isGuide ? "Set Guide Marks" : "Submit Peer Evaluation"}
        </DialogTitle>
        <DialogDescription>
          {effectiveStudentDetails ? (
            <>
              {isGuide ? "Enter guide marks for " : "Enter your peer marks for "}
              <strong>{effectiveStudentDetails.student.name}</strong> ({effectiveStudentDetails.student.rollNumber})
            </>
          ) : (
            "Loading student info..."
          )}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="marks" className="text-base font-medium">
            {isGuide ? "Guide Marks" : "Your Marks"} (out of 100)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="marks"
              type="number"
              min="0"
              max="100"
              step="1"
              required
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className="text-lg font-mono text-center max-w-[140px]"
              autoFocus
            />
            <span className="text-muted-foreground font-medium">/ 100</span>
          </div>
        </div>

        {/* Live Score Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Score Preview</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
                <div className="text-xs text-slate-400 mb-1">HR/Guide</div>
              <div className="font-bold text-slate-800">
                {isGuide
                  ? (isNaN(marksNum) ? "—" : marksNum)
                  : (currentGuide ?? "—")}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Peer Avg</div>
              <div className="font-bold text-slate-800">
                {currentPeerAvg != null ? currentPeerAvg.toFixed(1) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Final</div>
              <div className={`font-bold text-lg ${liveScore != null ? "text-green-600" : "text-slate-400"}`}>
                {liveScore != null ? liveScore.toFixed(1) : "—"}
              </div>
            </div>
          </div>
          {liveScore != null && previewGuide != null && previewPeer != null && (
            <p className="text-xs text-slate-500 font-mono text-center">
              (({previewGuide} + {previewPeer.toFixed(1)}) / 2) - (|{previewGuide} - {previewPeer.toFixed(1)}| x {HR_ALIGNMENT_PENALTY_RATE}) = {liveScore.toFixed(1)}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !marks} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Submit Evaluation
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
