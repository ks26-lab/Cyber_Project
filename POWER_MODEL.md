# GRIDSEC // ZERO — Electrical Power System & Battery Physics Model

Implemented in [`backend/app/power/models.py`](file:///Users/umikasood/Cyber_Project/backend/app/power/models.py), [`backend/app/power/distribution_networks.py`](file:///Users/umikasood/Cyber_Project/backend/app/power/distribution_networks.py), [`backend/app/power/ieee30_network.py`](file:///Users/umikasood/Cyber_Project/backend/app/power/ieee30_network.py), [`backend/app/power/solver.py`](file:///Users/umikasood/Cyber_Project/backend/app/power/solver.py), and [`backend/app/power/power_flow_service.py`](file:///Users/umikasood/Cyber_Project/backend/app/power/power_flow_service.py).

---

## 1. Nonlinear AC Power-Flow Formulation (`pandapower` 3.5.6)

All steady-state, post-fault, and post-restoration electrical states are computed using the nonlinear Newton-Raphson AC power-flow equations:

$$P_i(V, \theta) = \sum_{j=1}^{N} |V_i||V_j|\left(G_{ij}\cos(\theta_i - \theta_j) + B_{ij}\sin(\theta_i - \theta_j)\right) = P_{\text{gen},i} + P_{\text{bess},i} - P_{\text{load},i}$$

$$Q_i(V, \theta) = \sum_{j=1}^{N} |V_i||V_j|\left(G_{ij}\sin(\theta_i - \theta_j) - B_{ij}\cos(\theta_i - \theta_j)\right) = Q_{\text{gen},i} + Q_{\text{bess},i} - Q_{\text{load},i}$$

### Enforced Physical Operating Constraints
1. **Bus Voltage Bounds**: $V_{\min} \le |V_i| \le V_{\max}$ (typically $[0.92, 1.08]\text{ pu}$ for urban distribution and $[0.90, 1.10]\text{ pu}$ statutory limits).
2. **Branch Thermal Limits**: $I_{\ell} \le I_{\ell,\max}$ ($\text{Loading}_{\%} \le 100\%$).
3. **Substation / Slack Source Ceiling**: $P_{\text{slack}} \le P_{\text{source},\max}$ (flagged via `SOURCE_CAPACITY_EXCEEDED` when upstream supply is derated).
4. **Kirchhoff Power Conservation**: $\left|\sum P_{\text{gen}} - \left(\sum P_{\text{load}} + \sum P_{\text{loss}}\right)\right| < 10^{-4}\text{ MW}$.

---

## 2. Four Supported Electrical Networks

| Network ID | Voltage Level | Buses | Branches / Tie Switches | BESS Units | Description |
|---|---|---|---|---|---|
| `TRAINING_FEEDER` | 33 / 11 kV | 12 | 10 radial lines + 1 transformer + 4 NO tie switches | 2 (`BESS-CITY-1`, `BESS-HOSP-1`) | Smart City distribution feeder with Hospital, Water, SCADA, University, Residential, Industrial & Solar PV |
| `IEEE_33_DISTRIBUTION` | 12.66 kV | 33 | 32 sectionalizing + 5 NO tie switches | 2 (`BESS-33-1`, `BESS-33-2`) | Authentic Baran & Wu (1989) 33-bus radial distribution benchmark (`pandapower.networks.case33bw()`) |
| `IEEE_30` | 132 / 33 kV | 30 | 41 transmission branches | 0 | Standard IEEE 30-Bus transmission system with 6 generators/synchronous condensers |
| `INDIA_GRID_59` | 765 / 400 / 220 kV | 59 | 54 modeled inter-regional corridors | 0 | Indian National Grid 59-substation reference model across 5 RLDC regions |

---

## 3. Discrete-Time Battery Energy Storage Model (`BatteryModel`)

Unlike static models that conflate power ($\text{kW}$) with energy ($\text{kWh}$), `BatteryModel.step_energy(dispatch_kw, dt_hours)` strictly separates instantaneous active power injection $P_{\text{bess}}(t)\;[\text{kW}]$ from stored energy $E_{\text{bess}}(t)\;[\text{kWh}]$ over time step $\Delta t\;[\text{h}]$:

$$E_{\text{bess}}(t + \Delta t) = \begin{cases} E_{\text{bess}}(t) - \dfrac{P_{\text{dis}}(t)\,\Delta t}{\eta_d}, & P_{\text{dis}}(t) > 0 \\[8pt] E_{\text{bess}}(t) + |P_{\text{chg}}(t)|\,\Delta t\,\eta_c, & P_{\text{chg}}(t) < 0 \end{cases}$$

subject to:
- $-P_{\text{chg},\max} \le P_{\text{bess}}(t) \le P_{\text{dis},\max}$
- $\text{SOC}_{\min} \cdot E_{\text{cap}} \le E_{\text{bess}}(t + \Delta t) \le \text{SOC}_{\max} \cdot E_{\text{cap}}$



## Product interpretation and elapsed time

Each ordinary operator action advances the authoritative local clock by five minutes. Active batteries integrate energy for that elapsed interval on every action. Explicit time-advance uses its supplied duration; game storm trips also advance the backend clock. A dispatch is a power setpoint in kW, not a fixed fifteen-minute energy deduction.

Displayed served demand is attempted model allocation until the corresponding state meets the reported AC feasibility conditions. Graph-flow MW capacities are simplified planning limits and do not solve nonlinear voltage/phase equations. Reserve matching uses discrete one-source/one-load compatibility, not shared continuous dispatch. The game models its existing solar source and BESS, not an invented diesel fleet. Credit costs, turn budgets and scheduled storm arrivals are educational rules rather than physical weather/protection simulations.

The national dataset bundles 59 modeled nodes and 54 corridor references, with engineering assumptions for electrical parameters. Census-derived geographic paths are grouped by state and may differ from current administrative boundaries. It is not a live POWERGRID operational topology. No national asset is asserted to be physically connected to the separate local training feeder.
