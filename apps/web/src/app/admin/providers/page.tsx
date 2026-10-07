import { ProviderList } from "@/components/admin/ProviderList";

export default function AdminProvidersPage() {
  return (
    <ProviderList
      title="Providers"
      description="All providers who have been reviewed at least once."
      statusFilter="reviewed"
      emptyMessage="No reviewed providers yet."
    />
  );
}
