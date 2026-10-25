# CAPER — Criticality-Aware Power Emergency Restoration

**Authoritative Implementation:** [`backend/app/restoration/caper.py`](file:///Users/umikasood/Cyber_Project/backend/app/restoration/caper.py)  
**Interactive Frontend Inspector:** `/algorithms/caper` ([`apps/web/src/app/algorithms/caper/page.tsx`](file:///Users/umikasood/Cyber_Project/apps/web/src/app/algorithms/caper/page.tsx))

---

## 1. Motivation & Research Gap

During distribution and sub-transmission emergencies (physical feeder trips, upstream substation deratings, or coordinated cyber-induced breaker trips), operators face a coupled discrete-continuous optimization problem:
1. **Pure Graph Heuristics (`GRAPH_GREEDY`)** close the shortest-hop tie switch in $O(V + E)$ or $O((V + E)\log V)$ time, but ignore nonlinear AC voltage drops, reactive power demand, and upstream source ceilings—frequently causing secondary thermal cascades or undervoltage trips ($|V_i| < 0.92\text{ pu}$).
2. **Priority-Only Load Shedding (`PRIORITY_GREEDY`)** sheds low-priority loads within an energized island, but cannot reconfigure normally-open tie switches to rescue isolated Tier-1 hospitals or water treatment plants.
3. **Full Nonlinear AC Mixed-Integer Nonlinear Programming (AC-MINLP)** is NP-hard and computationally intractable for sub-second interactive SCADA decision support.

**CAPER** bridges this gap via an **8-stage hybrid Graph + Dynamic Programming + Post-Action Newton-Raphson AC Verification** pipeline that executes in ~15–25 ms while guaranteeing physical AC feasibility.

---

## 2. The 8-Stage CAPER Pipeline

```mermaid
flowchart LR
    S1["Stage 1: Incident & BESS Resource Audit"] --> S2["Stage 2: BFS + DSU + Tarjan Bridges"]
    S2 --> S3["Stage 3: Max-Heap Triage + 0/1 Knapsack DP"]
    S3 --> S4["Stage 4: Multi-Strategy Candidate Synthesis"]
    S4 --> S5["Stage 5: True Post-Action AC NR Load Flow"]
    S5 --> S6["Stage 6: Feasibility Filter & J(c) Scoring"]
    S6 --> S7["Stage 7: Optimal Plan Commit"]
    S7 --> S8["Stage 8: Explainable 6-Subtrace Audit"]
```

### Stage-by-Stage Breakdown
1. **Stage 1 — Incident Understanding & Resource Accounting**: Resolves faulted branches, upstream source capacity ceiling $P_{\text{source},\max}$, and available BESS discharge power/energy budgets.
2. **Stage 2 — Topological Graph Analysis (`BFS` + `DSU` + `TARJAN_BRIDGES`)**: Partitions the grid into energized and de-energized islands in $O(V + E)$ time and identifies single-point-of-failure bridge branches.
3. **Stage 3 — Criticality Triage (`MAX_HEAP_TRIAGE`) & Deficit Allocation (`KNAPSACK_DP`)**: Orders de-energized critical loads via a Binary Max-Heap and solves a 0/1 & Continuous Knapsack DP table (`O(N * W)`) to compute exact Tier-3 load curtailment when total supply is constrained.
4. **Stage 4 — Multi-Strategy Candidate Generation (`DIJKSTRA` + `KRUSKAL_MST` + BESS)**: Synthesizes a diverse portfolio of $K$ candidate restoration plans (Shortest-Impedance Tie Routing, Minimum-Loss Kruskal Spanning Forest, Full Tie + BESS + DP Curtailment, Conservative Critical-Only Island).
5. **Stage 5 — True Post-Action Newton-Raphson AC Power-Flow Validation**: Clones the electrical network for each candidate $c \in \mathcal{C}$, applies its switching, BESS dispatch, and load curtailment actions, and solves `pandapower.runpp()` Newton-Raphson AC power flow.
6. **Stage 6 — Multi-Objective Scoring & Feasibility Ranking**: Filters candidates violating $|V_i| \in [0.92, 1.08]\text{ pu}$, $\text{Loading}_e \le 100\%$, or $P_{\text{slack}} \le P_{\text{source},\max}$, and scores each candidate via:
   $$J(c) = 0.65\,\text{CritRestored}_{\%}(c) + 0.30\,\text{TotalRestored}_{\%}(c) + 8.0\,\mathcal{F}_{\text{Jain}}(c) - 3.5\,P_{\text{loss}}(c) - 1.2\,N_{\text{sw}}(c) - \Phi_{\text{viol}}(c)$$
7. **Stage 7 — Optimal Plan Selection & Transactional Commit**: Selects $c^* = \arg\max_{c \in \mathcal{C}} J(c)$ (lexicographically prioritizing AC-feasible plans).
8. **Stage 8 — Explainable Step-by-Step Trace Serialization**: Bundles the top-level CAPER trace with all 6 underlying DSA subtraces (`BFS`, `DSU`, `TARJAN_BRIDGES`, `DIJKSTRA`, `KRUSKAL_MST`, `KNAPSACK_DP`).

