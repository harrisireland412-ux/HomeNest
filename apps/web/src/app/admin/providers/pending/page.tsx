import { ProviderList } from "@/components/admin/ProviderList";

export default function AdminPendingProvidersPage() {
  return (
    <ProviderList
      title="Pending Requests"
      description="Brand-new provider applications awaiting first-time document review."
      statusFilter="pending"
      emptyMessage="No new applications right now — you're all caught up."
    />
  );
}
