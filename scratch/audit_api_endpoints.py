import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(name, path, method="GET", body=None):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    if body:
        data_bytes = json.dumps(body).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    else:
        data_bytes = None

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, data=data_bytes, timeout=15) as resp:
            status = resp.status
            elapsed_ms = (time.time() - start_time) * 1000
            resp_body = resp.read().decode('utf-8')
            try:
                resp_json = json.loads(resp_body)
                summary = f"Keys/Len: {len(resp_json) if isinstance(resp_json, (list, dict)) else type(resp_json)}"
            except Exception:
                summary = resp_body[:100]
            print(f"[{status}] {name} ({method} {path}) -> {elapsed_ms:.1f}ms | {summary}")
            return True, status, resp_json if 'resp_json' in locals() else resp_body
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.time() - start_time) * 1000
        err_body = e.read().decode('utf-8') if e.fp else str(e)
        print(f"[FAIL {e.code}] {name} ({method} {path}) -> {elapsed_ms:.1f}ms | Body: {err_body[:150]}")
        return False, e.code, err_body
    except Exception as e:
        elapsed_ms = (time.time() - start_time) * 1000
        print(f"[FAIL] {name} ({method} {path}) -> {elapsed_ms:.1f}ms | Error: {e}")
        return False, 0, str(e)

print("=== STARTING BACKEND API ENDPOINT AUDIT ===")

test_endpoint("Health Check", "/api/health")
test_endpoint("Grid Network Topology", "/api/grid/network")
test_endpoint("Grid Substations", "/api/grid/substations")
test_endpoint("Grid Transmission Lines", "/api/grid/transmission-lines")
test_endpoint("Grid Operators", "/api/grid/operators")

test_endpoint("Cyber Scenarios", "/api/cyber/scenarios")
test_endpoint("Cyber Eligible Targets", "/api/cyber/eligible-targets?scenario_id=SCENARIO_A_BREAKER_TRIP")
test_endpoint("Cyber Simulation", "/api/cyber/simulate", method="POST", body={
    "scenario_id": "SCENARIO_A_BREAKER_TRIP",
    "target_asset_id": "AUTO",
    "seed": 42,
    "apply_physical_consequence": True
})

test_endpoint("BFS Impact Analysis", "/api/analysis/impact", method="POST", body={
    "root_asset_id": "SUB-01",
    "max_hops": 3
})

test_endpoint("Dijkstra Alternate Route", "/api/analysis/alternate-route", method="POST", body={
    "source_asset_id": "GEN-01",
    "target_asset_id": "SUB-01",
    "avoid_nodes": [],
    "avoid_lines": []
})

test_endpoint("DFS Connectivity / Islanding", "/api/analysis/connectivity")

test_endpoint("Cascade Eligible Disturbances", "/api/cascades/eligible-disturbances")
test_endpoint("Cascade Simulation", "/api/cascades/simulate", method="POST", body={
    "initial_asset_id": "LINE-1-2",
    "initial_action": "TRIP",
    "max_depth": 3,
    "protection_threshold_line_loading_pct": 100.0
})

print("=== BACKEND API AUDIT COMPLETE ===")
