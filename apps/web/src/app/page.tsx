import Link from "next/link";
import { ArrowUpRight, Network, ShieldCheck, FlaskConical } from "lucide-react";
import { IndiaMap } from "@/components/maps/IndiaMap";
export default function HomePage() {
  return (
    <div className="px-6 lg:px-12 pb-16">
      <section className="hero-layout">
        <div>
          <div className="eyebrow">Cyber-physical grid resilience</div>
          <h1 className="hero-title">
            GRIDSEC <span className="text-blue-700">// ZERO</span>
          </h1>
          <h2 className="text-2xl font-medium mb-5">
            Keep the critical connected.
          </h2>
          <p className="hero-copy">
            Understand how power networks fail. Explore how explainable
            algorithms restore the infrastructure a city depends on.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link className="primary-button" href="/simulation">
              Explore Platform <ArrowUpRight size={16} />
            </Link>
            <Link className="secondary-button" href="/research">
              View Research
            </Link>
          </div>
          <div className="flex gap-10 mt-12 pt-6 border-t border-slate-200">
            <div>
              <strong className="text-2xl font-semibold">13</strong>
              <p className="text-xs text-slate-500">Explainable algorithms</p>
            </div>
            <div>
              <strong className="text-2xl font-semibold">4</strong>
              <p className="text-xs text-slate-500">Reference networks</p>
            </div>
          </div>
        </div>
        <Link href="/national-grid" aria-label="Explore the India grid map">
          <IndiaMap preview />
        </Link>
      </section>
      <section className="py-10 border-t border-slate-200 grid md:grid-cols-2 gap-12">
        <div>
          <div className="eyebrow">01 / The problem</div>
          <h2 className="text-3xl font-semibold mt-4 max-w-md">
            A single outage can reach far beyond the grid.
          </h2>
        </div>
        <p className="text-slate-500 text-base self-center max-w-xl">
          Hospitals, water systems and communication networks rely on continuous
          power. GRIDSEC connects graph theory, electrical constraints and cyber
          event analysis to study restoration decisions—and explain their
          consequences.
        </p>
      </section>
      <section className="module-grid">
        {[
          {
            icon: Network,
            title: "Explore the network",
            text: "Inspect city facilities, trace feeder faults and validate restoration with AC power flow.",
            href: "/simulation",
            link: "Open Simulation",
          },
          {
            icon: ShieldCheck,
            title: "Explain every decision",
            text: "Follow graph traversal, routing, critical-load allocation and the eight stages of CAPER.",
            href: "/algorithms",
            link: "Explore Algorithms",
          },
          {
            icon: FlaskConical,
            title: "Measure resilience",
            text: "Compare restoration strategies across seeded contingencies and inspect reproducible results.",
            href: "/research",
            link: "View Research",
          },
        ].map((m) => (
          <article className="module-card" key={m.href}>
            <m.icon size={22} className="text-blue-700" />
            <h3>{m.title}</h3>
            <p>{m.text}</p>
            <Link href={m.href}>{m.link} ↗</Link>
          </article>
        ))}
      </section>
      <section className="mt-12 grid md:grid-cols-3 gap-8 text-sm">
        {[
          [
            "Cyber + resilience",
            "Follow security events from breaker disruption to physical impact.",
            "/cyber-lab",
          ],
          [
            "India Grid",
            "Explore real geographic boundaries and the 59-node reference topology.",
            "/national-grid",
          ],
          [
            "A guided demonstration",
            "Walk through curated scenes, restoration and engineering evidence.",
            "/demo",
          ],
        ].map(([t, d, h]) => (
          <Link href={h} key={h} className="py-5 border-t border-slate-200">
            <h3 className="font-semibold mb-2">{t} ↗</h3>
            <p className="text-slate-500">{d}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
