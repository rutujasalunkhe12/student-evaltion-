import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useSeedData } from "@/hooks/use-seed";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  Database, 
  FileSpreadsheet, 
  LayoutDashboard,
  CheckCircle,
  UserCircle
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { mutate: seedData, isPending: isSeeding } = useSeedData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingFormCount, setPendingFormCount] = useState(0);

  const readPendingFormCount = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("evalportal_stored_students") || "[]");
      return Array.isArray(stored) ? stored.length : 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    setPendingFormCount(readPendingFormCount());
    const onStorage = () => setPendingFormCount(readPendingFormCount());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        queryClient.clear();
        window.location.href = "/login";
      }
    });
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/forms", label: "Forms Integration", icon: FileSpreadsheet },
    { href: "/seed-result", label: "Seed Result", icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="bg-primary/10 text-primary p-1.5 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
              <CheckCircle className="h-6 w-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
              EvalPortal
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.startsWith(link.href);
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() =>
              seedData(undefined, {
                onSuccess: (data: any) => {
                  setPendingFormCount(0);
                  const inserted = Array.isArray(data?.formStudentsInserted)
                    ? data.formStudentsInserted
                    : [];
                  const serverMessage = typeof data?.message === "string" ? data.message : "";
                  const serverNote = typeof data?.note === "string" ? data.note : "";
                  if (inserted.length > 0) {
                    toast({
                      title: "Seed Data Completed",
                      description: `Added ${inserted.length} form student(s).`,
                    });
                  } else if (serverMessage || serverNote) {
                    toast({
                      title: "Seed Data Completed",
                      description: [serverMessage, serverNote].filter(Boolean).join(". "),
                    });
                  } else {
                    toast({
                      title: "Seed Data Completed",
                      description: "No form students found to add.",
                    });
                  }
                  setLocation("/seed-result");
                },
                onError: () => {
                  toast({
                    title: "Seed Failed",
                    description: "Could not seed data. Please retry.",
                    variant: "destructive",
                  });
                  setLocation("/seed-result");
                },
              })
            }
            disabled={isSeeding}
            className="hidden md:flex gap-2"
          >
            <Database className="h-4 w-4 text-muted-foreground" />
            <span>{isSeeding ? "Seeding..." : "Seed Data"}</span>
            {pendingFormCount > 0 && !isSeeding && (
              <span className="text-xs font-semibold text-primary">
                (+{pendingFormCount} form)
              </span>
            )}
          </Button>

          {user && (
            <div className="flex items-center gap-4 pl-4 border-l border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold leading-none">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">
                    {user?.department || ''}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Logout"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
