"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getCategories, getCategoryServices, getServices, type Category, type Service } from "@/lib/api";
import {
  acceptBooking,
  addProviderServices,
  getMyProviderProfileOrNull,
  getMyProviderReviews,
  getProviderBookings,
  rejectBooking,
  type Booking,
  type ProviderMe,
  type ProviderReview,
} from "@/lib/auth";

function statusVariant(status: string) {
  if (status === "approved" || status === "confirmed") return "default" as const;
  if (status === "rejected" || status === "expired") return "destructive" as const;
  return "secondary" as const;
}

function responseDeadline(scheduledAt: string) {
  return new Date(new Date(scheduledAt).getTime() - 3 * 60 * 60 * 1000);
}

function AddServiceDialog({
  categories,
  existingServiceIds,
  onAdded,
}: {
  categories: Category[];
  existingServiceIds: Set<string>;
  onAdded: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, Service[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function toggleCategory(category: Category) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category.id)) {
        next.delete(category.id);
      } else {
        next.add(category.id);
      }
      return next;
    });

    if (!servicesByCategory[category.slug]) {
      const services = await getCategoryServices(category.slug);
      setServicesByCategory((prev) => ({ ...prev, [category.slug]: services ?? [] }));
    }
  }

  function toggleService(serviceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!token || selected.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addProviderServices(
        token,
        Array.from(selected).map((service_id) => ({ service_id }))
      );
      setSelected(new Set());
      setOpen(false);
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add service(s)");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Add a service</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a service</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {categories.map((category) => (
            <div key={category.id} className="rounded-lg border p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left font-medium"
                onClick={() => toggleCategory(category)}
              >
                {category.name}
                <span className="text-xs text-zinc-400">
                  {expandedCategories.has(category.id) ? "Hide" : "Show services"}
                </span>
              </button>
              {expandedCategories.has(category.id) && (
                <div className="mt-2 flex flex-col gap-2 border-t pt-2">
                  {(servicesByCategory[category.slug] ?? [])
                    .filter((service) => !existingServiceIds.has(service.id))
                    .map((service) => (
                      <label key={service.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selected.has(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        {service.name} — from ${service.base_price.toFixed(2)}
                      </label>
                    ))}
                  {(servicesByCategory[category.slug] ?? []).filter(
                    (service) => !existingServiceIds.has(service.id)
                  ).length === 0 && (
                    <p className="text-xs text-zinc-500">
                      You already offer every service in this category.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={selected.size === 0 || isSubmitting}>
            {isSubmitting ? "Adding…" : `Add ${selected.size || ""} service(s)`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<ProviderMe | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [providerProfile, providerBookings, allServices, allCategories, providerReviews] =
        await Promise.all([
          getMyProviderProfileOrNull(token),
          getProviderBookings(token).catch(() => []),
          getServices(),
          getCategories(),
          getMyProviderReviews(token).catch(() => []),
        ]);
      setProfile(providerProfile);
      setBookings(providerBookings);
      setServices(allServices);
      setCategories(allCategories);
      setReviews(providerReviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      router.push("/login?next=/provider/dashboard");
      return;
    }
    load();
  }, [token, user, router, load]);

  async function handleAccept(bookingId: string) {
    if (!token) return;
    setActionError(null);
    try {
      await acceptBooking(token, bookingId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to accept booking");
    }
  }

  async function handleReject(bookingId: string) {
    if (!token) return;
    setActionError(null);
    try {
      await rejectBooking(token, bookingId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject booking");
    }
  }

  function serviceName(serviceId: string) {
    return services.find((s) => s.id === serviceId)?.name ?? "Service";
  }

  function categoryName(categoryId: string) {
    return categories.find((c) => c.id === categoryId)?.name ?? "Category";
  }

  if (error) {
    return <p className="mx-auto max-w-2xl px-6 py-12 text-red-600">{error}</p>;
  }

  if (profile === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Skeleton className="h-8 w-1/3" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-zinc-500">You don&apos;t have a provider profile yet.</p>
        <Button className="mt-4" onClick={() => router.push("/become-provider/register")}>
          Become a Provider
        </Button>
      </div>
    );
  }

  const pendingRequests = bookings.filter((b) => b.status === "awaiting_provider");
  const otherBookings = bookings.filter((b) => b.status !== "awaiting_provider");
  const existingServiceIds = new Set(profile.services.map((s) => s.service_id));

  const completedBookings = bookings.filter((b) => b.status === "completed");
  const confirmedOrCompleted = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  );
  const decidedBookings = bookings.filter((b) =>
    ["confirmed", "completed", "rejected", "expired"].includes(b.status)
  );
  const earnings = confirmedOrCompleted.reduce((sum, b) => sum + b.total_price, 0);
  const acceptanceRate =
    decidedBookings.length > 0
      ? Math.round((confirmedOrCompleted.length / decidedBookings.length) * 100)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>

      <h2 className="mt-6 font-medium">Booking requests</h2>
      {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
      <div className="mt-2 flex flex-col gap-3">
        {pendingRequests.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="flex flex-col gap-2 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{serviceName(booking.service_id)}</span>
                <Badge variant="secondary">${booking.total_price.toFixed(2)}</Badge>
              </div>
              <p className="text-sm text-zinc-500">
                {new Date(booking.scheduled_at).toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">
                Respond by {responseDeadline(booking.scheduled_at).toLocaleString()} or this
                request expires automatically.
              </p>
              <div className="mt-1 flex gap-2">
                <Button size="sm" onClick={() => handleAccept(booking.id)}>
                  Accept
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleReject(booking.id)}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingRequests.length === 0 && (
          <p className="text-sm text-zinc-500">No pending booking requests.</p>
        )}
      </div>

      <Card className="mt-6">
        <CardContent className="pt-3">
          <h2 className="font-medium">Performance</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-semibold">{bookings.length}</p>
              <p className="text-xs text-zinc-500">Total bookings</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{completedBookings.length}</p>
              <p className="text-xs text-zinc-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">${earnings.toFixed(2)}</p>
              <p className="text-xs text-zinc-500">Earnings</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {acceptanceRate === null ? "—" : `${acceptanceRate}%`}
              </p>
              <p className="text-xs text-zinc-500">Acceptance rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-3">
          <h2 className="font-medium">Reviews & ratings</h2>
          <div className="mt-3 flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-xl font-semibold">{profile.rating.toFixed(1)}</span>
            <span className="text-sm text-zinc-500">
              ({profile.review_count} review{profile.review_count === 1 ? "" : "s"})
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{review.customer_name}</span>
                  <span className="flex items-center gap-1 text-sm text-zinc-500">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {review.rating}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-1 text-sm text-zinc-500">{review.comment}</p>
                )}
                <p className="mt-1 text-xs text-zinc-400">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="text-sm text-zinc-500">No reviews yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Identity verification</h2>
            <Badge variant={statusVariant(profile.identity_status)}>
              {profile.identity_status}
            </Badge>
          </div>
          {profile.identity_rejection_reason && (
            <p className="mt-2 text-sm text-red-600">
              Reason: {profile.identity_rejection_reason}
            </p>
          )}
        </CardContent>
      </Card>

      {otherBookings.length > 0 && (
        <>
          <h2 className="mt-6 font-medium">Booking history</h2>
          <div className="mt-2 flex flex-col gap-2">
            {otherBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between text-sm">
                <span>
                  {serviceName(booking.service_id)} —{" "}
                  {new Date(booking.scheduled_at).toLocaleDateString()}
                </span>
                <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
              </div>
            ))}
          </div>
        </>
      )}

      <Card className="mt-6">
        <CardContent className="pt-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Services</h2>
            <AddServiceDialog
              categories={categories}
              existingServiceIds={existingServiceIds}
              onAdded={load}
            />
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {profile.services.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>{serviceName(s.service_id)}</span>
                <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
              </li>
            ))}
            {profile.services.length === 0 && (
              <p className="text-sm text-zinc-500">No services added yet.</p>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-3">
          <h2 className="font-medium">Licenses</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {profile.licenses.map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <span>
                  {categoryName(l.category_id)} — {l.license_number} ({l.issuing_authority})
                </span>
                <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
              </li>
            ))}
            {profile.licenses.length === 0 && (
              <p className="text-sm text-zinc-500">No licenses uploaded.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
