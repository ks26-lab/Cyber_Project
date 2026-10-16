"""
Test HTTP REST Endpoints for Physics Power Flow & Sandbox Contingency.
"""

import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def post(url, data):
    req = urllib.request.Request(
        f"{BASE_URL}{url}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get(url):
    req = urllib.request.Request(f"{BASE_URL}{url}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("Testing Live API Endpoints on http://127.0.0.1:8000 ...")
    
    # 1. Health
    h = get("/api/health")
    print("Health:", h)
    assert h["status"] == "HEALTHY"
    
    # 2. Power Flow Status
    pfs = get("/api/power-flow/status")
    print("Power Flow Status:", pfs["status"], "| Solver:", pfs["solver_backend"])
    assert pfs["status"] == "OPERATIONAL"

    # 3. Solve 4-Bus Power Flow via HTTP POST
    res = post("/api/power-flow/run", {"network_id": "TEST_NETWORK", "scenario_id": "HTTP_TEST"})
    print("Power Flow Result Status:", res["status"])
    print("Kirchhoff Balance:", res["power_balance"]["total_generation_mw"], "MW Gen |", res["power_balance"]["total_load_mw"], "MW Load |", res["power_balance"]["total_losses_mw"], "MW Loss")
    assert res["status"] == "SUCCESS"
    assert res["power_balance"]["converged"] is True

    # 4. Route Electrical Validation
    route_check = post("/api/power-flow/validate-route", {
        "candidate_route": ["BUS-1", "BUS-2", "BUS-3"],
        "additional_mw": 150.0,
        "network_id": "TEST_NETWORK"
    })
    print("Candidate Route Validation:", route_check["status"], "| Feasible:", route_check["feasible"])
    assert route_check["feasible"] is True

    # 5. Create Sandbox Simulation
    sim = post("/api/simulation/create", {
        "name": "Live HTTP N-1 Contingency Drill",
        "scenario_type": "N-1_CONTINGENCY"
    })
    sim_id = sim["simulation_id"]
    print("Created Sandbox:", sim_id)

    # 6. Run Contingency on Sandbox Simulation
    ctg = post(f"/api/simulation/{sim_id}/contingency", {
        "asset_id": "LINE-1-3",
        "network_id": "TEST_NETWORK"
    })
    print("Contingency Result Status:", ctg["status"])
    print("Baseline Max Line Loading:", ctg["baseline_summary"]["max_line_loading_percent"], "%")
    print("Post-Trip Max Line Loading:", ctg["contingency_summary"]["max_line_loading_percent"], "%")
    print("Delta Loading:", ctg["delta_max_loading_percent"], "% | Delta Losses:", ctg["delta_losses_mw"], "MW")
    assert ctg["status"] == "SUCCESS"

    print("\nALL HTTP API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
