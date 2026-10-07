"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { login, signup } from "@/lib/auth";

type AuthMode = "login" | "signup";

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setFullName("");
    setEmail("");
    setPassword("");
    setError(null);
    setIsSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) setMode(initialMode);
    reset();
    onOpenChange(next);
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { access_token, user } =
        mode === "login" ? await login(email, password) : await signup(email, password, fullName);
      setSession(access_token, user);
      onOpenChange(false);
      reset();
      if (user.role === "admin") {
        router.push("/admin/providers");
      } else if (user.role === "provider") {
        router.push("/provider/dashboard");
      }
      // Customers stay put — they were likely already browsing something useful.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : mode === "login" ? "Login failed" : "Sign up failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Log in" : "Create your account"}</DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Access your HomeNest account."
              : "Book trusted home services in minutes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-fullName">Full name</Label>
              <Input
                id="dialog-fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dialog-email">Email</Label>
            <Input
              id="dialog-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dialog-password">Password</Label>
            <Input
              id="dialog-password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === "login"
                ? "Logging in…"
                : "Creating account…"
              : mode === "login"
                ? "Log in"
                : "Sign up"}
          </Button>
          <p className="text-center text-sm text-zinc-500">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-foreground hover:underline"
                  onClick={() => switchMode("signup")}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-foreground hover:underline"
                  onClick={() => switchMode("login")}
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
