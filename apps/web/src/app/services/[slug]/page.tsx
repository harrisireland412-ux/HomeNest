import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookNowButton } from "@/components/BookNowButton";
import { Badge } from "@/components/ui/badge";
import { getServiceBySlug } from "@/lib/api";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Back to home
      </Link>

      <div className="mt-4 overflow-hidden rounded-xl">
        <div className="relative h-64 w-full bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={service.image_url}
            alt={service.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </div>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{service.name}</h1>
          <div className="mt-2 flex gap-2">
            {service.is_featured && <Badge variant="secondary">Featured</Badge>}
            {service.is_popular && <Badge variant="outline">Popular</Badge>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Starting from</p>
          <p className="text-2xl font-semibold">${service.base_price.toFixed(2)}</p>
        </div>
      </div>

      <p className="mt-6 text-zinc-600 dark:text-zinc-400">{service.description}</p>

      <BookNowButton slug={service.slug} />
    </div>
  );
}
