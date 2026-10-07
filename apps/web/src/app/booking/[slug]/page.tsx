"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getApprovedProviders, getServiceBySlug, type Provider, type Service } from "@/lib/api";
import { createBooking, getMyProviderProfileOrNull, type Booking } from "@/lib/auth";

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!token || !user) {
      router.push(`/login?next=/booking/${params.slug}`);
      return;
    }
    getMyProviderProfileOrNull(token).then((profile) => {
      if (profile !== null) {
        router.push("/provider/dashboard");
      }
    });
    getServiceBySlug(params.slug).then(setService).catch(() => setError("Failed to load service"));
    getApprovedProviders(params.slug)
      .then(setProviders)
      .catch(() => setError("Failed to load providers"));
  }, [token, user, router, params.slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !service || !selectedProviderId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const booking = await createBooking(token, {
        service_id: service.id,
        provider_id: selectedProviderId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        address: { line1, city, state: stateRegion, postal_code: postalCode, country },
      });
      setConfirmedBooking(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <h1 className="text-xl font-semibold">Booking request sent!</h1>
            <p className="text-sm text-zinc-500">
              {service.name} is requested for{" "}
              {new Date(confirmedBooking.scheduled_at).toLocaleString()}. The provider has until
              3 hours before that time to accept — you&apos;ll see it update in My Bookings.
            </p>
            <p className="text-sm text-zinc-500">
              Total: ${confirmedBooking.total_price.toFixed(2)} — status: awaiting provider
              confirmation
            </p>
            <Button className="mt-4" onClick={() => router.push("/bookings")}>
              View my bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Book {service.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">From ${service.base_price.toFixed(2)}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <Label>Choose a provider</Label>
          <RadioGroup
            value={selectedProviderId ?? undefined}
            onValueChange={(value) => setSelectedProviderId(value as string)}
            className="mt-2"
          >
            {providers.map((provider) => (
              <label
                key={provider.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40 ${
                  selectedProviderId === provider.id
                    ? "border-primary bg-accent/40"
                    : "border-border"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{provider.display_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col">
                    <span className="font-medium">{provider.display_name}</span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {provider.rating.toFixed(1)} ({provider.review_count})
                    </span>
                  </span>
                </span>
                <RadioGroupItem value={provider.id} />
              </label>
            ))}
            {providers.length === 0 && (
              <p className="text-sm text-zinc-500">No providers available for this service yet.</p>
            )}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduledAt">Date & time</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="line1">Address line 1</Label>
          <Input id="line1" required value={line1} onChange={(e) => setLine1(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              required
              value={stateRegion}
              onChange={(e) => setStateRegion(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              required
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          size="lg"
          disabled={!selectedProviderId || isSubmitting}
        >
          {isSubmitting ? "Booking…" : `Pay $${service.base_price.toFixed(2)} & confirm`}
        </Button>
      </form>
    </div>
  );
}
