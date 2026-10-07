"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useFaqs } from "@/hooks/useCatalog";

export function FAQSection() {
  const { data: faqs, isLoading, isError } = useFaqs();

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}
      {isError && <p className="text-red-600">Couldn&apos;t load FAQs.</p>}
      {faqs && (
        <Accordion defaultValue={[]}>
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </section>
  );
}
