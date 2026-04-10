import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-destructive/10 p-4 rounded-full">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h1 className="text-4xl font-display font-bold text-slate-900">404</h1>
        <p className="text-lg text-slate-600">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/login" className="inline-block mt-4">
          <Button size="lg" className="w-full sm:w-auto">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
