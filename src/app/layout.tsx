import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "POC Next.js + tRPC + Prisma",
  description: "Proof of concept for Next.js with tRPC and Prisma ORM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          <div className="min-h-screen">
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
