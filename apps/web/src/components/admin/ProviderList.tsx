"use client";

import { ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminProviders,
  type AdminProviderListItem,
  type AdminProviderStatusFilter,
} from "@/lib/auth";

export function ProviderList({
  title,
  description,
  statusFilter,
  emptyMessage,
}: {
  title: string;
  description: string;
  statusFilter: AdminProviderStatusFilter;
  emptyMessage: string;
}) {
  const { token } = useAuth();
  const [providers, setProviders] = useState<AdminProviderListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setProviders(null);
    getAdminProviders(token, statusFilter)
      .then(setProviders)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load providers"));
  }, [token, statusFilter]);

  const pendingLicenses = providers?.reduce((sum, p) => sum + p.pending_license_count, 0) ?? 0;
  const pendingServices = providers?.reduce((sum, p) => sum + p.pending_service_count, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>

      {providers && providers.length > 0 && (pendingLicenses > 0 || pendingServices > 0) && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-semibold">{pendingLicenses}</p>
                <p className="text-sm text-zinc-500">Pending licenses</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-3">
              <UserCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-semibold">{pendingServices}</p>
                <p className="text-sm text-zinc-500">Pending service requests</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {!providers && !error && (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {providers?.length === 0 && <p className="mt-6 text-zinc-500">{emptyMessage}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {providers?.map((provider) => (
          <Link key={provider.id} href={`/admin/providers/${provider.id}`}>
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{provider.display_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{provider.display_name}</p>
                    <p className="text-sm text-zinc-500">
                      {provider.pending_license_count > 0 &&
                        `${provider.pending_license_count} pending license(s)`}
                      {provider.pending_license_count > 0 &&
                        provider.pending_service_count > 0 &&
                        " · "}
                      {provider.pending_service_count > 0 &&
                        `${provider.pending_service_count} pending service(s)`}
                      {provider.pending_license_count === 0 &&
                        provider.pending_service_count === 0 &&
                        "No pending items"}
                    </p>
                  </div>
                </div>
                <Badge variant={provider.identity_status === "approved" ? "default" : "secondary"}>
                  {provider.identity_status}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
