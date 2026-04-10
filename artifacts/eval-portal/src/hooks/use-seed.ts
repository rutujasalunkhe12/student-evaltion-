import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveApiUrl } from "@/lib/api-base";

const STORED_STUDENTS_KEY = "evalportal_stored_students";
const LAST_SEED_RESULT_KEY = "evalportal_last_seed_result";
const LAST_SEED_PAYLOAD_KEY = "evalportal_last_seed_payload";

export function useSeedData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const localStudents =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem(STORED_STUDENTS_KEY) || "[]")
          : [];
      const formStudents = Array.isArray(localStudents) ? localStudents : [];
      if (typeof window !== "undefined") {
        localStorage.setItem(
          LAST_SEED_PAYLOAD_KEY,
          JSON.stringify({ formStudents }),
        );
      }
      const res = await fetch(resolveApiUrl("/api/seed"), { 
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formStudents }),
      });
      if (!res.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            LAST_SEED_RESULT_KEY,
            JSON.stringify({
              message: "Seed request failed",
              note: `Server returned ${res.status}`,
              formStudentsInserted: [],
              csvBatchesInserted: [],
            }),
          );
          window.dispatchEvent(new Event("seed-updated"));
        }
        // If it fails, that's fine, we fallback gracefully
        console.warn("Seed endpoint missing or failed. Error expected if not implemented in backend.");
        throw new Error("Failed to seed data");
      }
      const data = await res.json();
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_SEED_RESULT_KEY, JSON.stringify(data));
        window.dispatchEvent(new Event("seed-updated"));
      }
      if (typeof window !== "undefined" && formStudents.length > 0) {
        localStorage.removeItem(STORED_STUDENTS_KEY);
        window.dispatchEvent(new Event("seed-updated"));
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    }
  });
}
