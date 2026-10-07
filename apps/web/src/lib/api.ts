export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  sort_order: number;
  requires_license: boolean;
};

export type Service = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  image_url: string;
  is_featured: boolean;
  is_popular: boolean;
};

export type Provider = {
  id: string;
  display_name: string;
  avatar_url: string;
  rating: number;
  review_count: number;
  is_featured: boolean;
};

export type Testimonial = {
  id: string;
  author_name: string;
  avatar_url: string;
  quote: string;
  rating: number;
};

export type FAQ = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type Offer = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  sort_order: number;
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

async function fetchJsonOrNull<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

export const getCategories = () => fetchJson<Category[]>("/categories");
export const getCategoryBySlug = (slug: string) =>
  fetchJsonOrNull<Category>(`/categories/${slug}`);
export const getCategoryServices = (slug: string) =>
  fetchJsonOrNull<Service[]>(`/categories/${slug}/services`);
export const getServiceBySlug = (slug: string) => fetchJsonOrNull<Service>(`/services/${slug}`);
export const getApprovedProviders = (slug: string) =>
  fetchJson<Provider[]>(`/services/${slug}/providers`);
export const getServices = (params?: { featured?: boolean; popular?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.featured !== undefined) query.set("featured", String(params.featured));
  if (params?.popular !== undefined) query.set("popular", String(params.popular));
  const qs = query.toString();
  return fetchJson<Service[]>(`/services${qs ? `?${qs}` : ""}`);
};
export const getProviders = (params?: { featured?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.featured !== undefined) query.set("featured", String(params.featured));
  const qs = query.toString();
  return fetchJson<Provider[]>(`/providers${qs ? `?${qs}` : ""}`);
};
export const getTestimonials = () => fetchJson<Testimonial[]>("/testimonials");
export const getFaqs = () => fetchJson<FAQ[]>("/faqs");
export const getOffers = () => fetchJson<Offer[]>("/offers");
