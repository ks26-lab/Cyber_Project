import type { Metadata } from "next";
import "./globals.css";
import { SimulationConnection } from "@/components/layout/SimulationConnection";
import { TopNavBar } from "@/components/layout/TopNavBar";

export const metadata: Metadata = {
  title: "GRIDSEC // ZERO — Grid Intelligence",
  description:
    "Explore modeled electricity networks, restore critical service, inspect algorithm evidence and play GRID COMMAND.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] antialiased selection:bg-blue-50 selection:text-blue-700 flex flex-col">
        <TopNavBar />
        <SimulationConnection />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
