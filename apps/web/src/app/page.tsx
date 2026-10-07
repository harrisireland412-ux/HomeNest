"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FAQSection } from "@/components/home/FAQSection";
import { Footer } from "@/components/home/Footer";
import { Hero } from "@/components/home/Hero";
import { PopularServices } from "@/components/home/PopularServices";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getMyProviderProfileOrNull } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [hasProviderProfile, setHasProviderProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token || !user) {
      setHasProviderProfile(false);
      return;
    }
    getMyProviderProfileOrNull(token)
      .then((profile) => setHasProviderProfile(profile !== null))
      .catch(() => setHasProviderProfile(false));
  }, [token, user]);

  useEffect(() => {
    if (hasProviderProfile) {
      router.replace("/provider/dashboard");
    }
  }, [hasProviderProfile, router]);

  if (hasProviderProfile === null || hasProviderProfile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Skeleton className="h-8 w-1/3" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <Hero />
        <CategoryGrid />
        <PopularServices />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
