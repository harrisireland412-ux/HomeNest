import { useQuery } from "@tanstack/react-query";

import {
  getCategories,
  getFaqs,
  getOffers,
  getProviders,
  getServices,
  getTestimonials,
} from "@/lib/api";

export const useCategories = () =>
  useQuery({ queryKey: ["categories"], queryFn: getCategories });

export const usePopularServices = () =>
  useQuery({ queryKey: ["services", { popular: true }], queryFn: () => getServices({ popular: true }) });

export const useFeaturedProviders = () =>
  useQuery({ queryKey: ["providers", { featured: true }], queryFn: () => getProviders({ featured: true }) });

export const useTestimonials = () =>
  useQuery({ queryKey: ["testimonials"], queryFn: getTestimonials });

export const useFaqs = () => useQuery({ queryKey: ["faqs"], queryFn: getFaqs });

export const useOffers = () => useQuery({ queryKey: ["offers"], queryFn: getOffers });
