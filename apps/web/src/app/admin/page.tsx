"use client";

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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getCategories, getServices, type Category, type Service } from "@/lib/api";
import { updateAdminService } from "@/lib/auth";

function EditServiceDialog({
  service,
  open,
  onOpenChange,
  onSaved,
}: {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [basePrice, setBasePrice] = useState(String(service.base_price));
  const [imageUrl, setImageUrl] = useState(service.image_url);
  const [isFeatured, setIsFeatured] = useState(service.is_featured);
  const [isPopular, setIsPopular] = useState(service.is_popular);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(service.name);
      setDescription(service.description);
      setBasePrice(String(service.base_price));
      setImageUrl(service.image_url);
      setIsFeatured(service.is_featured);
      setIsPopular(service.is_popular);
      setError(null);
    }
  }, [open, service]);

  async function handleSave() {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateAdminService(token, service.id, {
        name,
        description,
        base_price: Number(basePrice),
        image_url: imageUrl,
        is_featured: isFeatured,
        is_popular: isPopular,
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit service</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-name">Name</Label>
            <Input id="service-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-description">Description</Label>
            <Textarea
              id="service-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-price">Base price ($)</Label>
            <Input
              id="service-price"
              type="number"
              min={0}
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-image">Image URL</Label>
            <Input
              id="service-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isFeatured} onCheckedChange={(c) => setIsFeatured(c === true)} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPopular} onCheckedChange={(c) => setIsPopular(c === true)} />
            Popular
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminHomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const load = useCallback(async () => {
    try {
      const [allCategories, allServices] = await Promise.all([getCategories(), getServices()]);
      setCategories(allCategories);
      setServices(allServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Service Catalog</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Edit service pricing, descriptions, and homepage placement.
      </p>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {loading && (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {categories.map((category) => {
        const categoryServices = services.filter((s) => s.category_id === category.id);
        if (categoryServices.length === 0) return null;
        return (
          <div key={category.id} className="mt-8">
            <h2 className="mb-2 font-medium">{category.name}</h2>
            <div className="flex flex-col gap-2">
              {categoryServices.map((service) => (
                <Card key={service.id}>
                  <CardContent className="flex items-center justify-between pt-3">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-zinc-500">${service.base_price.toFixed(2)}</p>
                      <div className="mt-1 flex gap-1">
                        {service.is_featured && <Badge variant="secondary">Featured</Badge>}
                        {service.is_popular && <Badge variant="outline">Popular</Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditingService(service)}>
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {editingService && (
        <EditServiceDialog
          service={editingService}
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
