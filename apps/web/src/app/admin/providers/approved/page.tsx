import { ProviderList } from "@/components/admin/ProviderList";

export default function AdminApprovedProvidersPage() {
  return (
    <ProviderList
      title="Approved Providers"
      description="Providers who are live and bookable on HomeNest."
      statusFilter="approved"
      emptyMessage="No approved providers yet."
    />
  );
}
