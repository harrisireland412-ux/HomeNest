import { API_URL } from "@/lib/api";

export type UserRole = "customer" | "provider" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function signup(
  email: string,
  password: string,
  fullName: string
): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export type AddressInput = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type ServiceSelectionInput = {
  service_id: string;
  custom_price?: number;
};

export type ProviderRegisterInput = {
  email: string;
  password: string;
  full_name: string;
  phone_primary: string;
  phone_alternate?: string;
  bio?: string;
  years_experience?: number;
  address: AddressInput;
  services: ServiceSelectionInput[];
};

export async function registerProvider(data: ProviderRegisterInput): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/providers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export type ProviderOnboardInput = {
  phone_primary: string;
  phone_alternate?: string;
  bio?: string;
  years_experience?: number;
  address: AddressInput;
  services: ServiceSelectionInput[];
};

export async function onboardExistingProvider(
  token: string,
  data: ProviderOnboardInput
): Promise<ProviderMe> {
  const res = await fetch(`${API_URL}/providers/me/onboard`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export type ProviderServiceStatus = "pending" | "approved" | "rejected";
export type LicenseStatus = "pending" | "approved" | "rejected" | "expired";
export type IdentityStatus = "pending" | "action_required" | "approved" | "rejected";
export type KYCDocumentType = "photo_id" | "address_proof";

export type ProviderServiceRecord = {
  id: string;
  service_id: string;
  custom_price: number | null;
  status: ProviderServiceStatus;
};

export type ProviderLicenseRecord = {
  id: string;
  category_id: string;
  license_number: string;
  issuing_authority: string;
  expiry_date: string;
  status: LicenseStatus;
  rejection_reason: string | null;
};

export type KYCDocumentRecord = {
  id: string;
  document_type: KYCDocumentType;
};

export type ProviderMe = {
  id: string;
  display_name: string;
  phone_primary: string | null;
  phone_alternate: string | null;
  bio: string | null;
  years_experience: number | null;
  identity_status: IdentityStatus;
  identity_rejection_reason: string | null;
  rating: number;
  review_count: number;
  services: ProviderServiceRecord[];
  licenses: ProviderLicenseRecord[];
  documents: KYCDocumentRecord[];
};

export type AddressRecord = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type AdminProviderDetail = ProviderMe & {
  email: string;
  address: AddressRecord | null;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function getMyProviderProfile(token: string): Promise<ProviderMe> {
  const res = await fetch(`${API_URL}/providers/me`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function getMyProviderProfileOrNull(token: string): Promise<ProviderMe | null> {
  const res = await fetch(`${API_URL}/providers/me`, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function addProviderServices(
  token: string,
  selections: ServiceSelectionInput[]
): Promise<ProviderServiceRecord[]> {
  const res = await fetch(`${API_URL}/providers/me/services`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(selections),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function uploadProviderLicense(
  token: string,
  params: {
    category_id: string;
    license_number: string;
    issuing_authority: string;
    expiry_date: string;
    file: File;
  }
): Promise<ProviderLicenseRecord> {
  const form = new FormData();
  form.set("category_id", params.category_id);
  form.set("license_number", params.license_number);
  form.set("issuing_authority", params.issuing_authority);
  form.set("expiry_date", params.expiry_date);
  form.set("file", params.file);

  const res = await fetch(`${API_URL}/providers/me/licenses`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function uploadKYCDocument(
  token: string,
  documentType: KYCDocumentType,
  file: File
): Promise<KYCDocumentRecord> {
  const form = new FormData();
  form.set("document_type", documentType);
  form.set("file", file);

  const res = await fetch(`${API_URL}/providers/me/kyc-documents`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export type AdminProviderListItem = {
  id: string;
  display_name: string;
  identity_status: string;
  pending_license_count: number;
  pending_service_count: number;
};

export type AdminProviderStatusFilter = "pending" | "approved" | "reviewed";

export async function getAdminProviders(
  token: string,
  statusFilter: AdminProviderStatusFilter
): Promise<AdminProviderListItem[]> {
  const res = await fetch(`${API_URL}/admin/providers?status_filter=${statusFilter}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function getAdminProviderDetail(
  token: string,
  providerId: string
): Promise<AdminProviderDetail> {
  const res = await fetch(`${API_URL}/admin/providers/${providerId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function getProviderFileBlob(
  token: string,
  path: string
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? "download";
  const blob = await res.blob();
  return { blob, filename };
}

export async function updateAdminService(
  token: string,
  serviceId: string,
  data: {
    name?: string;
    description?: string;
    base_price?: number;
    image_url?: string;
    is_featured?: boolean;
    is_popular?: boolean;
  }
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/services/${serviceId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
}

export async function approveProviderIdentity(token: string, providerId: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/providers/${providerId}/identity/approve`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
}

export async function rejectProviderIdentity(
  token: string,
  providerId: string,
  reason: string
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/providers/${providerId}/identity/reject`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
}

export async function approveProviderLicense(
  token: string,
  providerId: string,
  licenseId: string
): Promise<void> {
  const res = await fetch(
    `${API_URL}/admin/providers/${providerId}/licenses/${licenseId}/approve`,
    { method: "POST", headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(await parseErrorDetail(res));
}

export async function rejectProviderLicense(
  token: string,
  providerId: string,
  licenseId: string,
  reason: string
): Promise<void> {
  const res = await fetch(
    `${API_URL}/admin/providers/${providerId}/licenses/${licenseId}/reject`,
    {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );
  if (!res.ok) throw new Error(await parseErrorDetail(res));
}

export type BookingStatus =
  | "awaiting_provider"
  | "confirmed"
  | "rejected"
  | "expired"
  | "completed"
  | "cancelled";

export type Booking = {
  id: string;
  service_id: string;
  provider_id: string;
  address_id: string;
  scheduled_at: string;
  status: BookingStatus;
  total_price: number;
  has_review: boolean;
};

export type BookingCreateInput = {
  service_id: string;
  provider_id: string;
  scheduled_at: string;
  address: AddressInput;
};

export async function createBooking(token: string, data: BookingCreateInput): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function getMyBookings(token: string): Promise<Booking[]> {
  const res = await fetch(`${API_URL}/bookings/me`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function getProviderBookings(token: string): Promise<Booking[]> {
  const res = await fetch(`${API_URL}/bookings/provider/me`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function acceptBooking(token: string, bookingId: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings/${bookingId}/accept`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function rejectBooking(token: string, bookingId: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings/${bookingId}/reject`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function completeBooking(token: string, bookingId: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings/${bookingId}/complete`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function cancelBooking(token: string, bookingId: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function submitReview(
  token: string,
  bookingId: string,
  data: { rating: number; comment?: string }
): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings/${bookingId}/review`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export type ProviderReview = {
  id: string;
  booking_id: string;
  service_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_name: string;
};

export async function getMyProviderReviews(token: string): Promise<ProviderReview[]> {
  const res = await fetch(`${API_URL}/providers/me/reviews`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}
