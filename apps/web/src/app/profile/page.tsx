"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getMyProviderProfileOrNull } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [hasProviderProfile, setHasProviderProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token || !user) {
      router.push("/login?next=/profile");
      return;
    }
    getMyProviderProfileOrNull(token)
      .then((profile) => setHasProviderProfile(profile !== null))
      .catch(() => setHasProviderProfile(false));
  }, [token, user, router]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-6 h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>

      <Card className="mt-6">
        <CardContent className="flex items-center gap-4 pt-3">
          <Avatar size="lg">
            <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">{user.full_name}</p>
            <p className="text-sm text-zinc-500">{user.email}</p>
            <p className="text-sm text-zinc-500">
              Account type:{" "}
              <span className="capitalize">
                {user.role === "admin"
                  ? "Admin"
                  : hasProviderProfile === true
                    ? "Provider"
                    : "Customer"}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {hasProviderProfile === true && (
          <Link href="/provider/dashboard" className={buttonVariants()}>
            Provider Dashboard
          </Link>
        )}
        {hasProviderProfile !== true && (
          <Link href="/bookings" className={buttonVariants({ variant: "outline" })}>
            My Bookings
          </Link>
        )}
        {hasProviderProfile === false && (
          <Link href="/become-provider/register" className={buttonVariants()}>
            Become a Provider
          </Link>
        )}

        {user.role === "admin" && (
          <Link href="/admin/providers" className={buttonVariants({ variant: "outline" })}>
            Admin Panel
          </Link>
        )}
      </div>
    </div>
  );
}
