"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getServices, type Service } from "@/lib/api";
import {
  approveProviderIdentity,
  approveProviderLicense,
  getAdminProviderDetail,
  getProviderFileBlob,
  rejectProviderIdentity,
  rejectProviderLicense,
  type AdminProviderDetail,
} from "@/lib/auth";

function statusVariant(status: string) {
  if (status === "approved") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  return "secondary" as const;
}

function RejectButton({ onConfirm }: { onConfirm: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleConfirm() {
    await onConfirm(reason || "Not specified");
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>Reject</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject submission</DialogTitle>
          <DialogDescription>
            Provide a reason so the provider knows what to fix and can resubmit.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Rejection reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="destructive" onClick={handleConfirm}>
            Confirm rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [profile, setProfile] = useState<AdminProviderDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [data, allServices] = await Promise.all([
        getAdminProviderDetail(token, params.id),
        getServices(),
      ]);
      setProfile(data);
      setServices(allServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load provider");
    }
  }, [token, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  function serviceName(serviceId: string) {
    return services.find((s) => s.id === serviceId)?.name ?? "Service";
  }

  async function handleViewFile(path: string) {
    if (!token) return;
    setFileError(null);
    try {
      const { blob } = await getProviderFileBlob(token, path);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to open file");
    }
  }

  if (error) return <p className="mx-auto max-w-2xl px-6 py-12 text-red-600">{error}</p>;

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-8 w-1/2" />
        <Skeleton className="mt-6 h-24 w-full" />
      </div>
    );
  }

  async function handleApproveIdentity() {
    if (!token) return;
    await approveProviderIdentity(token, params.id);
    await load();
  }

  async function handleRejectIdentity(reason: string) {
    if (!token) return;
    await rejectProviderIdentity(token, params.id, reason);
    await load();
  }

  async function handleApproveLicense(licenseId: string) {
    if (!token) return;
    await approveProviderLicense(token, params.id, licenseId);
    await load();
  }

  async function handleRejectLicense(licenseId: string, reason: string) {
    if (!token) return;
    await rejectProviderLicense(token, params.id, licenseId, reason);
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/providers" className="text-sm text-zinc-500 hover:underline">
        &larr; Back to providers
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
      <p className="text-sm text-zinc-500">{profile.email}</p>
      <p className="text-sm text-zinc-500">
        {profile.phone_primary} {profile.phone_alternate ? `/ ${profile.phone_alternate}` : ""}
      </p>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-1 pt-3 text-sm">
          <h2 className="mb-1 font-medium">Applicant details</h2>
          {profile.address ? (
            <p className="text-zinc-500">
              {profile.address.line1}
              {profile.address.line2 ? `, ${profile.address.line2}` : ""}, {profile.address.city},{" "}
              {profile.address.state} {profile.address.postal_code}, {profile.address.country}
            </p>
          ) : (
            <p className="text-zinc-500">No address on file.</p>
          )}
          {profile.years_experience !== null && (
            <p className="text-zinc-500">{profile.years_experience} years of experience</p>
          )}
          {profile.bio && <p className="text-zinc-500">{profile.bio}</p>}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex flex-col gap-3 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Identity</h2>
            <Badge variant={statusVariant(profile.identity_status)}>
              {profile.identity_status}
            </Badge>
          </div>
          {fileError && <p className="text-sm text-red-600">{fileError}</p>}
          <div className="flex flex-col gap-1">
            {profile.documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() =>
                  handleViewFile(`/admin/providers/${profile.id}/documents/${doc.id}`)
                }
                className="w-fit text-sm text-primary hover:underline"
              >
                View {doc.document_type.replace("_", " ")}
              </button>
            ))}
            {profile.documents.length === 0 && (
              <p className="text-sm text-zinc-500">No documents submitted.</p>
            )}
          </div>
          {profile.identity_status !== "approved" && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleApproveIdentity}>
                Approve
              </Button>
              <RejectButton onConfirm={handleRejectIdentity} />
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mt-6 font-medium">Licenses</h2>
      <div className="mt-2 flex flex-col gap-3">
        {profile.licenses.map((license) => (
          <Card key={license.id}>
            <CardContent className="flex flex-col gap-3 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{license.license_number}</p>
                  <p className="text-sm text-zinc-500">
                    {license.issuing_authority} — expires {license.expiry_date}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleViewFile(
                        `/admin/providers/${profile.id}/licenses/${license.id}/file`
                      )
                    }
                    className="text-sm text-primary hover:underline"
                  >
                    View document
                  </button>
                </div>
                <Badge variant={statusVariant(license.status)}>{license.status}</Badge>
              </div>
              {license.status !== "approved" && (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleApproveLicense(license.id)}>
                    Approve
                  </Button>
                  <RejectButton onConfirm={(reason) => handleRejectLicense(license.id, reason)} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {profile.licenses.length === 0 && (
          <p className="text-sm text-zinc-500">No licenses submitted.</p>
        )}
      </div>

      <h2 className="mt-6 font-medium">Services (derived status)</h2>
      <div className="mt-2 flex flex-col gap-2">
        {profile.services.map((service) => (
          <div key={service.id} className="flex items-center justify-between text-sm">
            <span>{serviceName(service.service_id)}</span>
            <Badge variant={statusVariant(service.status)}>{service.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
