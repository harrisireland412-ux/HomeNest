import { SearchBar } from "@/components/home/SearchBar";

export function Hero() {
  return (
    <section className="border-b bg-gradient-to-b from-zinc-50 to-white px-6 py-16 dark:from-zinc-950 dark:to-black sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Home services, done right.
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Book trusted, verified professionals for cleaning, repairs, salon, and more —
          right at your doorstep.
        </p>
        <SearchBar />
      </div>
    </section>
  );
}
