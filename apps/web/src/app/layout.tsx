import type { Metadata } from "next";
import "./globals.css";
import { TopNavBar } from "@/components/layout/TopNavBar";

export const metadata: Metadata = {
  title: "GRIDSEC // ZERO — THE CITY MUST STAY ALIVE",
  description:
    "Cyber-Physical Grid Resilience, Intelligent Critical-Load Restoration & Explainable Graph Optimization Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-50 selection:text-blue-700 flex flex-col">
        <TopNavBar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
