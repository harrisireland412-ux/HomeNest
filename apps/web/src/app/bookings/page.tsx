"use client";

import { CalendarX, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getServices, type Service } from "@/lib/api";
import { cancelBooking, completeBooking, getMyBookings, submitReview, type Booking } from "@/lib/auth";

function statusVariant(status: string) {
  if (status === "confirmed" || status === "completed") return "default" as const;
  if (status === "cancelled" || status === "rejected" || status === "expired") {
    return "destructive" as const;
  }
  return "secondary" as const;
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_provider: "Awaiting provider",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function ReviewDialog({
  bookingId,
  onSubmitted,
}: {
  bookingId: string;
  onSubmitted: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitReview(token, bookingId, { rating, comment: comment || undefined });
      setOpen(false);
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Leave a review</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your experience</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
            >
              <Star
                className={`h-6 w-6 ${
                  value <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Tell us about the service (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelBookingDialog({
  bookingId,
  onCancelled,
}: {
  bookingId: string;
  onCancelled: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await cancelBooking(token, bookingId);
      setOpen(false);
      await onCancelled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>
        Cancel booking
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500">This can&apos;t be undone.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Cancelling…" : "Yes, cancel booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [b, s] = await Promise.all([getMyBookings(token), getServices()]);
      setBookings(b);
      setServices(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      router.push("/login?next=/bookings");
      return;
    }
    load();
  }, [token, user, router, load]);

  async function handleComplete(bookingId: string) {
    if (!token) return;
    setActionError(null);
    try {
      await completeBooking(token, bookingId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to mark booking as completed");
    }
  }

  function serviceName(serviceId: string) {
    return services.find((s) => s.id === serviceId)?.name ?? "Service";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">My Bookings</h1>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {actionError && <p className="mt-4 text-red-600">{actionError}</p>}

      {!bookings && !error && (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {bookings?.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <CalendarX className="h-10 w-10 text-zinc-400" />
          <p className="text-zinc-500">You haven&apos;t booked anything yet.</p>
          <Link href="/#categories" className={buttonVariants({ size: "sm" })}>
            Browse services
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {bookings?.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="flex flex-col gap-2 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{serviceName(booking.service_id)}</p>
                  <p className="text-sm text-zinc-500">
                    {new Date(booking.scheduled_at).toLocaleString()} · $
                    {booking.total_price.toFixed(2)}
                  </p>
                </div>
                <Badge variant={statusVariant(booking.status)}>
                  {statusLabel(booking.status)}
                </Badge>
              </div>
              {(booking.status === "awaiting_provider" || booking.status === "confirmed") && (
                <div className="flex gap-2">
                  {booking.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleComplete(booking.id)}
                    >
                      Mark as completed
                    </Button>
                  )}
                  <CancelBookingDialog bookingId={booking.id} onCancelled={load} />
                </div>
              )}
              {booking.status === "completed" && !booking.has_review && (
                <div>
                  <ReviewDialog bookingId={booking.id} onSubmitted={load} />
                </div>
              )}
              {booking.status === "completed" && booking.has_review && (
                <p className="text-sm text-zinc-500">You reviewed this booking.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
