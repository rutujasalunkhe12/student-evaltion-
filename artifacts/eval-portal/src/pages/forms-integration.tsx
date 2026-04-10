import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetBatches } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { resolveApiUrl } from "@/lib/api-base";
import {
  ExternalLink,
  FileSpreadsheet,
  Link2,
  CheckCircle,
  UserPlus,
  Loader2,
  AlertCircle,
} from "lucide-react";

const FORM_URL_KEY = "evalportal_ms_form_url";
const STORED_STUDENTS_KEY = "evalportal_stored_students";

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
  }
];

export default function FormsIntegration() {
  const queryClient = useQueryClient();
  const [formUrl, setFormUrl] = useState<string>(() => localStorage.getItem(FORM_URL_KEY) || "");
  const [urlInput, setUrlInput] = useState<string>(() => localStorage.getItem(FORM_URL_KEY) || "");
  const [urlSaved, setUrlSaved] = useState(!!localStorage.getItem(FORM_URL_KEY));

  const { data: batches } = useGetBatches();
  
  // Use sample batches if API returns empty or fails
  const displayBatches = Array.isArray(batches) && batches.length > 0 ? batches : SAMPLE_BATCHES;

  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addError, setAddError] = useState("");
  const [savedLocally, setSavedLocally] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const didAttemptSync = useRef(false);

  useEffect(() => {
    if (displayBatches && displayBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(String(displayBatches[0].id));
    }
  }, [displayBatches, selectedBatchId]);

  const syncLocalStudents = async () => {
    const stored = JSON.parse(localStorage.getItem(STORED_STUDENTS_KEY) || "[]");
    if (!Array.isArray(stored) || stored.length === 0) {
      setSyncStatus("done");
      setSyncMessage("No local form entries to sync.");
      return;
    }

    setSyncStatus("syncing");
    setSyncMessage("");
    let syncedCount = 0;

    const remaining = [];
    for (const student of stored) {
      try {
          const res = await fetch(resolveApiUrl("/api/students/add"), {
            method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: student.name,
            rollNumber: student.rollNumber,
            batchId: student.batchId,
            department: student.department,
            password: student.password || "password123",
          }),
        });

        if (res.ok) {
          syncedCount += 1;
        } else {
          remaining.push(student);
        }
      } catch {
        remaining.push(student);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(STORED_STUDENTS_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(STORED_STUDENTS_KEY);
    }

    if (syncedCount > 0) {
      await queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    }

    if (remaining.length === 0) {
      setSyncStatus("done");
      setSyncMessage("Local form entries synced to backend and preserved in seed data.");
    } else {
      setSyncStatus("error");
      setSyncMessage(
        "Some local form entries could not be synced yet. Ensure you are signed in as a guide and try again.",
      );
    }
  };

  useEffect(() => {
    if (didAttemptSync.current) return;
    didAttemptSync.current = true;
    void syncLocalStudents();
  }, [queryClient]);

  const handleSaveUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    localStorage.setItem(FORM_URL_KEY, trimmed);
    setFormUrl(trimmed);
    setUrlSaved(true);
  };

  const handleClearUrl = () => {
    localStorage.removeItem(FORM_URL_KEY);
    setFormUrl("");
    setUrlInput("");
    setUrlSaved(false);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !rollNumber || !selectedBatchId) return;
    setAddStatus("loading");
    setAddError("");
    setSavedLocally(false);

    try {
      const res = await fetch(resolveApiUrl("/api/students/add"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName,
          rollNumber,
          batchId: parseInt(selectedBatchId),
          department,
          password: "password123",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error || "Failed to add student");
        setAddStatus("error");
        return;
      }
      setAddStatus("success");
      setStudentName("");
      setRollNumber("");
      setDepartment("Computer Science");
      await queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      setTimeout(() => setAddStatus("idle"), 3000);
    } catch {
      try {
        const studentData = {
          id: `local_${Date.now()}`,
          name: studentName,
          rollNumber,
          batchId: parseInt(selectedBatchId, 10),
          department,
          password: "password123",
          isFormAdded: true,
          createdAt: new Date().toISOString(),
        };

        const existingStudents = JSON.parse(localStorage.getItem(STORED_STUDENTS_KEY) || "[]");
        existingStudents.push(studentData);
        localStorage.setItem(STORED_STUDENTS_KEY, JSON.stringify(existingStudents));

        setSavedLocally(true);
        setAddStatus("success");
        setStudentName("");
        setRollNumber("");
        setDepartment("Computer Science");
        await queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
        setTimeout(() => setAddStatus("idle"), 3000);
      } catch {
        setAddError("Could not save the student details. Please try again.");
        setAddStatus("error");
      }
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Microsoft Forms Integration</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Paste your Microsoft Forms link to embed it here. Student details submitted via the form or manually are stored in the system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: URL setup + Add Student */}
        <div className="space-y-6">
          {/* MS Form URL Config */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Microsoft Form Link
              </CardTitle>
              <CardDescription>
                Paste your Microsoft Forms URL below to embed it directly in the portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formUrl">Your Microsoft Forms URL</Label>
                <Input
                  id="formUrl"
                  type="url"
                  placeholder="https://forms.office.com/Pages/ResponsePage.aspx?id=..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveUrl} className="gap-2 flex-1" disabled={!urlInput.trim()}>
                  <CheckCircle className="h-4 w-4" />
                  {urlSaved ? "Update Form URL" : "Save & Embed"}
                </Button>
                {urlSaved && (
                  <Button variant="outline" onClick={handleClearUrl}>
                    Clear
                  </Button>
                )}
              </div>
              {urlSaved && formUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-primary"
                  onClick={() => window.open(formUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Add Student Manually */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add Student Manually
              </CardTitle>
              <CardDescription>
                Add a student's details directly — same as submitting via the Microsoft Form.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Ananya Gupta"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. CS2021020"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchId">Assign to Batch</Label>
                  <select
                    id="batchId"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required
                  >
                    {displayBatches && displayBatches.length > 0 && displayBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.projectTitle}
                      </option>
                    ))}
                  </select>
                </div>

                {addStatus === "error" && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {addError}
                  </div>
                )}
              {addStatus === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {savedLocally
                    ? <>Student added locally. Start the API later if you want it saved to the backend too. Default password: <strong>password123</strong></>
                    : <>Student added successfully and preserved in seed data. Default password: <strong>password123</strong></>}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => void syncLocalStudents()}
                disabled={syncStatus === "syncing"}
              >
                {syncStatus === "syncing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Sync Now
              </Button>

              {syncStatus === "syncing" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing previously saved form entries to seed data...
                </div>
              )}
              {syncStatus === "done" && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {syncMessage || "Local form entries synced to backend and preserved in seed data."}
                </div>
              )}
              {syncStatus === "error" && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {syncMessage || "Some local form entries could not be synced yet. Ensure you are signed in as a guide and try again."}
                </div>
              )}

                <Button type="submit" className="w-full gap-2" disabled={addStatus === "loading"}>
                  {addStatus === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Add Student to System
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Embedded form or placeholder */}
        <div>
          <Card className="border-0 shadow-xl overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 bg-white rounded-md text-xs text-slate-400 px-3 py-1.5 flex items-center gap-2 font-mono truncate">
                {formUrl || "No form URL set"}
              </div>
              {formUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 text-xs gap-1"
                  onClick={() => window.open(formUrl, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Button>
              )}
            </div>

            <div className="flex-1 relative">
              {formUrl ? (
                <iframe
                  src={formUrl}
                  title="Microsoft Form"
                  className="absolute inset-0 w-full h-full border-0"
                  allow="camera; microphone"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                  <FileSpreadsheet className="h-16 w-16 text-blue-200 mb-4" />
                  <h3 className="text-xl font-bold text-slate-700">No Form Linked</h3>
                  <p className="text-slate-500 mt-2 max-w-sm">
                    Paste your Microsoft Forms URL in the panel on the left and click{" "}
                    <strong>Save & Embed</strong> to display the form here.
                  </p>
                  <p className="text-slate-400 text-sm mt-4">
                    Students can fill the form and their details will sync to the portal.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
