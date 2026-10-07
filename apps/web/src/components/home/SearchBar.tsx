"use client";

import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  return (
    <form
      className="flex w-full max-w-2xl flex-col gap-2 rounded-xl border bg-white p-2 shadow-sm dark:bg-zinc-900 sm:flex-row"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex flex-1 items-center gap-2 rounded-lg px-3">
        <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
        <Input
          placeholder="Your location"
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="hidden w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />
      <div className="flex flex-[2] items-center gap-2 rounded-lg px-3">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <Input
          placeholder="What service do you need?"
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <Button type="submit" className="sm:w-32">
        Search
      </Button>
    </form>
  );
}
