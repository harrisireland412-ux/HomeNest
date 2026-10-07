import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  {
    title: "Earn on your schedule",
    description: "Set your own availability and take bookings that work for you.",
  },
  {
    title: "Grow your customer base",
    description: "Get discovered by customers searching for your services nearby.",
  },
  {
    title: "Get paid reliably",
    description: "Payments are handled through HomeNest — no chasing invoices.",
  },
  {
    title: "Support when you need it",
    description: "Our support team is here to help with disputes, payouts, and more.",
  },
];

export default function BecomeProviderPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Become a HomeNest Provider</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Join thousands of professionals offering cleaning, repairs, salon, and more to
          customers in your area.
        </p>
        <Link
          href="/become-provider/register"
          className={buttonVariants({ size: "lg", className: "mt-8" })}
        >
          Register as a Provider
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <Card key={benefit.title}>
            <CardContent className="pt-3">
              <h3 className="font-medium">{benefit.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{benefit.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
