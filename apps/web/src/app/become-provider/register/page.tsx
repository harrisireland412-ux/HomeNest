"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getCategories, getCategoryServices, type Category, type Service } from "@/lib/api";
import {
  getMyProviderProfileOrNull,
  onboardExistingProvider,
  registerProvider,
  uploadKYCDocument,
  uploadProviderLicense,
} from "@/lib/auth";

const STEP_LABELS = [
  "Personal Details",
  "Service Details",
  "Address",
  "Contact Details",
  "License & Documents",
  "Review & Submit",
];

type SelectedService = {
  service: Service;
  category: Category;
  customPrice: string;
};

type LicenseDraft = {
  licenseNumber: string;
  issuingAuthority: string;
  expiryDate: string;
  file: File | null;
};

export default function BecomeProviderRegisterPage() {
  const router = useRouter();
  const { token, user, setSession } = useAuth();
  const isAuthenticated = !!token && !!user;

  const [checkingExistingProfile, setCheckingExistingProfile] = useState(true);
  // Authenticated users skip Step 1 (no account creation needed) and start at Service Details.
  const steps = isAuthenticated ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  const [categories, setCategories] = useState<Category[]>([]);
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, Service[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 (unauthenticated only)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [selectedServices, setSelectedServices] = useState<Record<string, SelectedService>>({});
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");

  // Step 3
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // Step 4
  const [phonePrimary, setPhonePrimary] = useState("");
  const [phoneAlternate, setPhoneAlternate] = useState("");

  // Step 5
  const [licenses, setLicenses] = useState<Record<string, LicenseDraft>>({});
  const [photoId, setPhotoId] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);

  // Step 6
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setError("Failed to load categories"));
  }, []);

  useEffect(() => {
    if (!token) {
      setCheckingExistingProfile(false);
      return;
    }
    getMyProviderProfileOrNull(token)
      .then((profile) => {
        if (profile) {
          router.push("/provider/dashboard");
        } else {
          setCheckingExistingProfile(false);
        }
      })
      .catch(() => setCheckingExistingProfile(false));
  }, [token, router]);

  async function toggleCategory(category: Category) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category.id)) {
        next.delete(category.id);
      } else {
        next.add(category.id);
      }
      return next;
    });

    if (!servicesByCategory[category.slug]) {
      const services = await getCategoryServices(category.slug);
      setServicesByCategory((prev) => ({ ...prev, [category.slug]: services ?? [] }));
    }
  }

  function toggleService(service: Service, category: Category) {
    setSelectedServices((prev) => {
      const next = { ...prev };
      if (next[service.id]) {
        delete next[service.id];
      } else {
        next[service.id] = { service, category, customPrice: "" };
      }
      return next;
    });
  }

  const selectedList = Object.values(selectedServices);
  const requiredCategoryIds = new Set(
    selectedList.filter((s) => s.category.slug && s.category).map((s) => s.category.id)
  );
  const categoriesNeedingLicense = categories.filter(
    (c) => requiredCategoryIds.has(c.id) && c.requires_license
  );

  function canProceed(): boolean {
    if (step === 1) return fullName.trim() !== "" && email.trim() !== "" && password.length >= 8;
    if (step === 2) return selectedList.length > 0;
    if (step === 3)
      return (
        line1.trim() !== "" &&
        city.trim() !== "" &&
        stateRegion.trim() !== "" &&
        postalCode.trim() !== "" &&
        country.trim() !== ""
      );
    if (step === 4) return phonePrimary.trim() !== "";
    if (step === 5) {
      const licensesOk = categoriesNeedingLicense.every((c) => {
        const draft = licenses[c.id];
        return draft && draft.licenseNumber && draft.issuingAuthority && draft.expiryDate && draft.file;
      });
      return licensesOk && photoId !== null && addressProof !== null;
    }
    if (step === 6) return termsAccepted;
    return true;
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const servicePayload = selectedList.map((s) => ({
        service_id: s.service.id,
        custom_price: s.customPrice ? Number(s.customPrice) : undefined,
      }));
      const addressPayload = {
        line1,
        line2: line2 || undefined,
        city,
        state: stateRegion,
        postal_code: postalCode,
        country,
      };

      let accessToken: string;
      if (isAuthenticated && token) {
        await onboardExistingProvider(token, {
          phone_primary: phonePrimary,
          phone_alternate: phoneAlternate || undefined,
          bio: bio || undefined,
          years_experience: yearsExperience ? Number(yearsExperience) : undefined,
          address: addressPayload,
          services: servicePayload,
        });
        accessToken = token;
      } else {
        const { access_token, user: newUser } = await registerProvider({
          email,
          password,
          full_name: fullName,
          phone_primary: phonePrimary,
          phone_alternate: phoneAlternate || undefined,
          bio: bio || undefined,
          years_experience: yearsExperience ? Number(yearsExperience) : undefined,
          address: addressPayload,
          services: servicePayload,
        });
        setSession(access_token, newUser);
        accessToken = access_token;
      }

      for (const category of categoriesNeedingLicense) {
        const draft = licenses[category.id];
        if (draft?.file) {
          await uploadProviderLicense(accessToken, {
            category_id: category.id,
            license_number: draft.licenseNumber,
            issuing_authority: draft.issuingAuthority,
            expiry_date: draft.expiryDate,
            file: draft.file,
          });
        }
      }

      if (photoId) await uploadKYCDocument(accessToken, "photo_id", photoId);
      if (addressProof) await uploadKYCDocument(accessToken, "address_proof", addressProof);

      router.push("/provider/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (checkingExistingProfile) {
    return <p className="mx-auto max-w-2xl px-6 py-12 text-zinc-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Become a Provider</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Step {stepIndex + 1} of {steps.length}: {STEP_LABELS[step - 1]}
      </p>
      <Progress value={((stepIndex + 1) / steps.length) * 100} className="mt-3" />

      <div className="mt-8 flex flex-col gap-4">
        {step === 1 && (
          <>
            <Field label="Full name">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-zinc-500">At least 8 characters.</p>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-zinc-500">
              Select every service you want to offer. You can pick services across multiple
              categories.
            </p>
            <div className="flex flex-col gap-2">
              {categories.map((category) => (
                <div key={category.id} className="rounded-lg border p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left font-medium"
                    onClick={() => toggleCategory(category)}
                  >
                    {category.name}
                    <span className="text-xs text-zinc-400">
                      {expandedCategories.has(category.id) ? "Hide" : "Show services"}
                    </span>
                  </button>
                  {expandedCategories.has(category.id) && (
                    <div className="mt-2 flex flex-col gap-2 border-t pt-2">
                      {(servicesByCategory[category.slug] ?? []).map((service) => (
                        <label
                          key={service.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={!!selectedServices[service.id]}
                            onCheckedChange={() => toggleService(service, category)}
                          />
                          {service.name} — from ${service.base_price.toFixed(2)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Field label="Years of experience (optional)">
              <Input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </Field>
            <Field label="Short bio (optional)">
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Address line 1">
              <Input value={line1} onChange={(e) => setLine1(e.target.value)} />
            </Field>
            <Field label="Address line 2 (optional)">
              <Input value={line2} onChange={(e) => setLine2(e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="State / region">
              <Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} />
            </Field>
            <Field label="Postal code">
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </Field>
            <Field label="Country">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Primary phone">
              <Input value={phonePrimary} onChange={(e) => setPhonePrimary(e.target.value)} />
            </Field>
            <Field label="Alternate phone (optional)">
              <Input
                value={phoneAlternate}
                onChange={(e) => setPhoneAlternate(e.target.value)}
              />
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            {categoriesNeedingLicense.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-zinc-500">
                  The following categories require a license. Upload one per category.
                </p>
                {categoriesNeedingLicense.map((category) => {
                  const draft = licenses[category.id] ?? {
                    licenseNumber: "",
                    issuingAuthority: "",
                    expiryDate: "",
                    file: null,
                  };
                  return (
                    <div key={category.id} className="rounded-lg border p-3">
                      <p className="font-medium">{category.name} license</p>
                      <div className="mt-2 flex flex-col gap-2">
                        <Input
                          placeholder="License number"
                          value={draft.licenseNumber}
                          onChange={(e) =>
                            setLicenses((prev) => ({
                              ...prev,
                              [category.id]: { ...draft, licenseNumber: e.target.value },
                            }))
                          }
                        />
                        <Input
                          placeholder="Issuing authority"
                          value={draft.issuingAuthority}
                          onChange={(e) =>
                            setLicenses((prev) => ({
                              ...prev,
                              [category.id]: { ...draft, issuingAuthority: e.target.value },
                            }))
                          }
                        />
                        <Input
                          type="date"
                          value={draft.expiryDate}
                          onChange={(e) =>
                            setLicenses((prev) => ({
                              ...prev,
                              [category.id]: { ...draft, expiryDate: e.target.value },
                            }))
                          }
                        />
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            setLicenses((prev) => ({
                              ...prev,
                              [category.id]: {
                                ...draft,
                                file: e.target.files?.[0] ?? null,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Field label="Government-issued photo ID">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setPhotoId(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="Proof of address">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAddressProof(e.target.files?.[0] ?? null)}
              />
            </Field>
          </>
        )}

        {step === 6 && (
          <>
            <div className="rounded-lg border p-4 text-sm">
              <p>
                <strong>{isAuthenticated ? user?.full_name : fullName}</strong> —{" "}
                {isAuthenticated ? user?.email : email}
              </p>
              <p className="mt-1 text-zinc-500">
                {line1}, {city}, {stateRegion}, {postalCode}, {country}
              </p>
              <p className="mt-2 font-medium">Services</p>
              <ul className="mt-1 list-inside list-disc text-zinc-500">
                {selectedList.map((s) => (
                  <li key={s.service.id}>
                    {s.service.name} ({s.category.name})
                  </li>
                ))}
              </ul>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              />
              I agree to the HomeNest Provider Terms of Service.
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            Back
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            >
              Next
            </Button>
          ) : (
            <Button type="button" disabled={!canProceed() || isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Submitting…" : "Submit for verification"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
