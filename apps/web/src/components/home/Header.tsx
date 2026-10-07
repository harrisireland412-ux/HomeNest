"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getMyProviderProfileOrNull } from "@/lib/auth";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, logout } = useAuth();
  const [hasProviderProfile, setHasProviderProfile] = useState(false);
  const [authDialog, setAuthDialog] = useState<{ open: boolean; mode: "login" | "signup" }>({
    open: false,
    mode: "login",
  });

  useEffect(() => {
    if (!token || !user) {
      setHasProviderProfile(false);
      return;
    }
    getMyProviderProfileOrNull(token)
      .then((profile) => setHasProviderProfile(profile !== null))
      .catch(() => setHasProviderProfile(false));
  }, [token, user]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  function openAuth(mode: "login" | "signup") {
    setAuthDialog({ open: true, mode });
  }

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur dark:bg-black/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          HomeNest
        </Link>
        <nav className="hidden gap-6 text-sm text-zinc-600 dark:text-zinc-400 sm:flex">
          {!hasProviderProfile && (
            <Link href="/#categories" className="hover:text-foreground">
              Services
            </Link>
          )}
          {!hasProviderProfile && (
            <Link href="/become-provider" className="hover:text-foreground">
              Become a Provider
            </Link>
          )}
          {user && !hasProviderProfile && (
            <Link href="/bookings" className="hover:text-foreground">
              My Bookings
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/providers" className="hover:text-foreground">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex gap-2">
          {user ? (
            <>
              <Link
                href="/profile"
                className="hidden self-center text-sm text-zinc-500 hover:text-foreground sm:inline"
              >
                {user.full_name}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => openAuth("signup")}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>

      <AuthDialog
        open={authDialog.open}
        onOpenChange={(open) => setAuthDialog((s) => ({ ...s, open }))}
        initialMode={authDialog.mode}
      />
    </header>
  );
}
