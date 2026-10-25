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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#06090F] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col">
        <TopNavBar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}

