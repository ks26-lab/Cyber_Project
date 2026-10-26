"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Zap, Maximize2, Minimize2 } from "lucide-react";
const links = [
  ["/", "Overview"],
  ["/simulation", "Simulation"],
  ["/algorithms", "Algorithms"],
  ["/research", "Research"],
  ["/national-grid", "India Grid"],
  ["/cyber-lab", "Cyber Lab"],
  ["/demo", "Demo"],
];
export function TopNavBar() {
  const path = usePathname();
  const [present, setPresent] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.presentation = String(present);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresent(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [present]);
  return (
    <header className="site-header">
      <div className="brand-row">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Zap size={18} />
          </span>
          GRIDSEC <span className="text-blue-700">// ZERO</span>
        </Link>
        <span className="brand-caption">
          Infrastructure resilience, explained.
        </span>
        <button
          className="quiet-button presentation-toggle"
          aria-pressed={present}
          onClick={() => setPresent(!present)}
        >
          {present ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{" "}
          {present ? "Exit presentation" : "Present"}
        </button>
      </div>
      <nav aria-label="Primary navigation" className="primary-nav">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (href === "/" ? path === "/" : path.startsWith(href))
                ? "page"
                : undefined
            }
          >
            {label}
          </Link>
        ))}
        <details className="more-nav">
          <summary>More</summary>
          <div>
            {[
              ["/missions", "Missions"],
              ["/dashboard", "Power flow"],
              ["/algorithms/caper", "CAPER engine"],
              ["/challenge", "Human vs AI"],
              ["/sandbox", "Sandbox"],
              ["/docs", "Documentation"],
            ].map(([h, l]) => (
              <Link href={h} key={h}>
                {l}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}
