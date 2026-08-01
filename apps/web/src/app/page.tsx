"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  db: boolean;
  redis: boolean;
};

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        HomeNest
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">API health check</p>
      {error && <p className="text-red-600">Error: {error}</p>}
      {health && (
        <pre className="rounded-lg bg-white p-4 text-sm shadow dark:bg-zinc-900 dark:text-zinc-100">
          {JSON.stringify(health, null, 2)}
        </pre>
      )}
      {!health && !error && <p className="text-zinc-500">Loading…</p>}
    </div>
  );
}
