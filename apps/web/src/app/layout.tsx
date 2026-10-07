import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/home/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HomeNest — Book trusted home services",
    template: "%s — HomeNest",
  },
  description: "Book cleaning, repairs, salon, and more from verified home-service professionals.",
  openGraph: {
    title: "HomeNest — Book trusted home services",
    description:
      "Book cleaning, repairs, salon, and more from verified home-service professionals.",
    siteName: "HomeNest",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#3654c9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
