import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-zinc-50 px-6 py-10 text-sm text-zinc-500 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">HomeNest</span>
        <div className="flex gap-6">
          <Link href="/#categories" className="hover:text-foreground">
            Services
          </Link>
          <Link href="/become-provider" className="hover:text-foreground">
            Become a Provider
          </Link>
        </div>
        <span>© {new Date().getFullYear()} HomeNest. All rights reserved.</span>
      </div>
    </footer>
  );
}
