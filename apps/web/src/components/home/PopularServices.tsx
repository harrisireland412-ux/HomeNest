"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePopularServices } from "@/hooks/useCatalog";

export function PopularServices() {
  const { data: services, isLoading, isError } = usePopularServices();

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Popular services</h2>
      {isError && <p className="text-red-600">Couldn&apos;t load services.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-32 w-full rounded-none" />
              <CardContent className="flex flex-col gap-2 pt-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        {services?.map((service) => (
          <Link key={service.id} href={`/services/${service.slug}`}>
            <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative h-32 w-full bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src={service.image_url}
                  alt={service.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <CardContent className="flex flex-col gap-1 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{service.name}</span>
                  {service.is_featured && <Badge variant="secondary">Featured</Badge>}
                </div>
                <p className="line-clamp-2 text-sm text-zinc-500">{service.description}</p>
                <span className="mt-1 text-sm font-semibold">
                  From ${service.base_price.toFixed(2)}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
