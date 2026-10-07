"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/providers/pending", label: "Pending Requests" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, logout } = useAuth();

  useEffect(() => {
    if (!token || !user) {
      router.push("/login?next=/admin");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
    }
  }, [token, user, router]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-white dark:bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="text-xl font-semibold tracking-tight">
            HomeNest <span className="text-sm font-normal text-zinc-500">Admin</span>
          </Link>
          <nav className="hidden gap-6 text-sm text-zinc-600 dark:text-zinc-400 sm:flex">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "font-medium text-foreground"
                      : "hover:text-foreground"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:inline">{user.full_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
