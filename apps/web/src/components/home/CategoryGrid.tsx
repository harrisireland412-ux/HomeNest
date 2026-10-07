"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCatalog";

export function CategoryGrid() {
  const { data: categories, isLoading, isError } = useCategories();

  return (
    <section id="categories" className="mx-auto max-w-6xl px-6 py-12 scroll-mt-20">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Browse by category</h2>
      {isError && <p className="text-red-600">Couldn&apos;t load categories.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {isLoading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border p-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        {categories?.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:border-primary/40 hover:bg-zinc-50 hover:shadow-sm dark:hover:bg-zinc-900"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <DynamicIcon name={category.icon_name as IconName} className="h-5 w-5 text-accent-foreground" />
            </span>
            <span className="text-sm font-medium">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
