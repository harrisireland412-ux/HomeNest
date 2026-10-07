import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCategoryBySlug, getCategoryServices } from "@/lib/api";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category, services] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryServices(slug),
  ]);

  if (!category || !services) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Back to home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{category.name}</h1>
      <p className="mt-1 text-zinc-500">{services.length} services available</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Link key={service.id} href={`/services/${service.slug}`}>
            <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative h-36 w-full bg-zinc-100 dark:bg-zinc-800">
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
        {services.length === 0 && (
          <p className="text-zinc-500">No services available in this category yet.</p>
        )}
      </div>
    </div>
  );
}
