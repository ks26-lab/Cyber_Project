"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
export function TopNavBar() {
  const path = usePathname(),
    router = useRouter();
  const [guided, setGuided] = useState(false);
  return (
    <header className="site-header">
      <div className="brand-row">
        <Link href="/" className="brand">
          GRIDSEC <span className="text-blue-800">{"// ZERO"}</span>
        </Link>
        <span className="brand-caption">Keep the critical connected.</span>
        <Link
          href="/grid-command"
          className="command-nav-link"
          aria-current={path === "/grid-command" ? "page" : undefined}
        >
          Play Grid Command
        </Link>
        <button
          className="quiet-button"
          aria-pressed={guided}
          onClick={() => {
            setGuided(!guided);
            if (!guided) router.push("/");
          }}
        >
          Guided Demo
        </button>
      </div>
      <nav aria-label="Primary navigation" className="primary-nav">
        {[
          ["/", "Explore"],
          ["/restore", "Restore"],
          ["/results", "Results"],
        ].map(([h, l]) => (
          <Link key={h} href={h} aria-current={path === h ? "page" : undefined}>
            {l}
          </Link>
        ))}
        <details className="more-nav">
          <summary>Technical Lab</summary>
          <div>
            {[
              ["/algorithms", "Algorithm explorer"],
              ["/algorithms/caper", "CAPER inspector"],
              ["/cyber-lab", "Cybersecurity laboratory"],
              ["/missions", "Missions"],
              ["/sandbox", "Sandbox"],
              ["/research", "Full research"],
              ["/dashboard", "Power-flow dashboard"],
              ["/simulation", "3D simulator"],
              ["/national-grid", "National grid operations"],
              ["/challenge", "Human vs AI"],
              ["/docs", "Documentation"],
              ["/demo", "Faculty walkthrough"],
            ].map(([h, l]) => (
              <Link
                href={h}
                key={h}
                onClick={(e) =>
                  e.currentTarget.closest("details")?.removeAttribute("open")
                }
              >
                {l}
              </Link>
            ))}
          </div>
        </details>
      </nav>
      {guided && (
        <div className="guide-strip" role="status">
          {path === "/"
            ? "1 / Explore — Select a substation to see its connections, then explore a local outage."
            : path === "/restore"
              ? "2 / Restore — Investigate, find a plan, then apply it. Open the explanation to follow the evidence."
              : path === "/results"
                ? "3 / Results — Compare measured recovery with the baseline."
                : "Technical Lab — Return to Explore to follow the case study."}
          <button className="quiet-button" onClick={() => setGuided(false)}>
            Close guide
          </button>
        </div>
      )}
    </header>
  );
}
