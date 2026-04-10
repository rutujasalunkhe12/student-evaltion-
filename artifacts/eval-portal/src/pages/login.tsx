import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { resolveApiUrl } from "@/lib/api-base";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isAuthLoading } = useGetMe({
    query: {
      retry: false,
    }
  });
  
  const { mutate: login, isPending, error } = useLogin();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerStatus, setRegisterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [registerMessage, setRegisterMessage] = useState("");

  // Redirect if already logged in
  if (!isAuthLoading && user) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalizedUsername = username.trim();
    login(
      { data: { username: normalizedUsername, password } },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        },
      }
    );
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterStatus("loading");
    setRegisterMessage("");

    try {
      const res = await fetch(resolveApiUrl("/api/students/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          password: registerPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegisterStatus("error");
        setRegisterMessage(data?.error || "Registration failed");
        return;
      }
      setRegisterStatus("success");
      setRegisterMessage("Registration successful. You can now sign in.");
      setRegisterName("");
      setRegisterPassword("");
    } catch {
      setRegisterStatus("error");
      setRegisterMessage("Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl opacity-50" />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary text-primary-foreground p-2 rounded-2xl shadow-lg shadow-primary/20">
              <CheckCircle className="h-8 w-8" />
            </div>
            <span className="font-display font-bold text-3xl tracking-tight text-foreground">
              EvalPortal
            </span>
          </div>

          <Card className="border-0 shadow-2xl shadow-black/5 bg-white/80 backdrop-blur-xl">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
              <CardDescription className="text-center text-base">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p>{error.error || "Invalid credentials. Please try again."}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username or Roll Number</Label>
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. guide1 or CS2021001"
                    className="bg-white/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/50"
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => setLocation("/forms")}
                >
                  Register / Submit Form
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-xs text-center text-muted-foreground font-semibold uppercase tracking-wider mb-4">
                  Student Register
                </p>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="registerName">Student Name</Label>
                    <Input
                      id="registerName"
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="e.g. Ananya Gupta"
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Password</Label>
                    <Input
                      id="registerPassword"
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Create a password"
                      className="bg-white/50"
                    />
                  </div>

                  {registerStatus === "error" && (
                    <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p>{registerMessage}</p>
                    </div>
                  )}
                  {registerStatus === "success" && (
                    <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm flex items-start gap-2 border border-green-200">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <p>{registerMessage}</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 text-base" disabled={registerStatus === "loading"}>
                    {registerStatus === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </div>

              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-xs text-center text-muted-foreground font-semibold uppercase tracking-wider mb-4">
                  Sample Credentials
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-secondary/50 border border-border/50">
                    <p className="text-xs font-semibold mb-1 text-primary">Guide Access</p>
                    <p className="text-xs text-muted-foreground font-mono">U: guide1<br/>P: password123</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 border border-border/50">
                    <p className="text-xs font-semibold mb-1 text-primary">Student Access</p>
                    <p className="text-xs text-muted-foreground font-mono">U: CS2021001<br/>P: password123</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Optional Hero Image Side - hidden on mobile */}
      <div className="hidden lg:block relative w-0 flex-1 bg-gradient-to-br from-blue-50 to-slate-100">
        <img
          className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-80"
          src={`${import.meta.env.BASE_URL}images/login-hero.png`}
          alt="Abstract evaluation visualization"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>
    </div>
  );
}
