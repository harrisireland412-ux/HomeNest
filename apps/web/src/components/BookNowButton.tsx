"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getMyProviderProfileOrNull } from "@/lib/auth";

export function BookNowButton({ slug }: { slug: string }) {
  const { token, user } = useAuth();
  const [hasProviderProfile, setHasProviderProfile] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      setHasProviderProfile(false);
      return;
    }
    getMyProviderProfileOrNull(token)
      .then((profile) => setHasProviderProfile(profile !== null))
      .catch(() => setHasProviderProfile(false));
  }, [token, user]);

  if (hasProviderProfile) {
    return (
      <div className="mt-8 flex flex-col items-start gap-2">
        <p className="text-sm text-zinc-500">
          Providers don&apos;t book services — view the requests you&apos;ve received instead.
        </p>
        <Link
          href="/provider/dashboard"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          View current requests
        </Link>
      </div>
    );
  }

  const href = user ? `/booking/${slug}` : `/login?next=/booking/${slug}`;

  return (
    <Link
      href={href}
      className={buttonVariants({ size: "lg", className: "mt-8 w-full sm:w-auto" })}
    >
      Book now
    </Link>
  );
}
