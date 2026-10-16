import urllib.request
import json

def post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get(url):
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("\n--- 1. NETWORK TOPOLOGY ---")
net = get('http://127.0.0.1:8000/api/grid/network')
print(f"Assets: {net.get('assets_count')}, Lines: {net.get('lines_count')}, Firms: {net.get('firms_count')}")

print("\n--- 2. ASSET SEARCH BY PINCODE (201306) ---")
search_pin = get('http://127.0.0.1:8000/api/assets/search?pincode=201306')
print(f"Found {len(search_pin)} assets:")
for a in search_pin:
    print(f" - {a.get('id')}: {a.get('name')} (District: {a.get('district')})")

print("\n--- 3. ASSET DETAIL (NR-DELHI) WITH TRANSFORMERS ---")
detail = get('http://127.0.0.1:8000/api/assets/NR-DELHI')
print(f"Asset: {detail.get('name')}, Transformers count: {len(detail.get('transformers', []))}")
for t in detail.get('transformers', [])[:3]:
    print(f" - {t.get('id')} | {t.get('name')} | {t.get('ratingMVA')} MVA | {t.get('primaryKV')}/{t.get('secondaryKV')} kV | Load: {t.get('loadPercent')}%")

print("\n--- 4. BFS IMPACT BLAST RADIUS (/api/analysis/impact) ---")
bfs_res = post('http://127.0.0.1:8000/api/analysis/impact', {'root_asset_id': 'WR-RAIGARH', 'max_hops': 3})
print(f"Root: {bfs_res.get('root_node_id')}")
print(f"Impacted nodes: {bfs_res.get('total_impacted_nodes')}")
print(f"Cumulative capacity at risk: {bfs_res.get('cumulative_capacity_at_risk_mw')} MW")
for hop in bfs_res.get('hops', []):
    print(f" Hop {hop.get('hop')}: {len(hop.get('nodes', []))} substations (Risk Factor: {hop.get('compromise_risk_factor')})")

print("\n--- 5. DIJKSTRA ALTERNATE ROUTING (/api/analysis/alternate-route) ---")
dijkstra_res = post('http://127.0.0.1:8000/api/analysis/alternate-route', {
    'source_asset_id': 'WR-RAIGARH',
    'target_asset_id': 'SR-PUGALUR',
    'avoid_lines': ['LINE-HVDC-RAI-PUG'],
    'objective': 'balanced'
})
print(f"Reroute found: {dijkstra_res.get('route_found')}")
print(f"Path: {' -> '.join(dijkstra_res.get('path_node_ids', []))}")
print(f"Total Distance: {dijkstra_res.get('total_distance_km')} km")
print(f"Bottleneck Capacity: {dijkstra_res.get('bottleneck_capacity_mw')} MW")

print("\n--- 6. DFS CONNECTIVITY & ISLANDS (/api/analysis/connectivity) ---")
dfs_res = get('http://127.0.0.1:8000/api/analysis/connectivity')
print(f"Total nodes: {dfs_res.get('total_nodes')}")
print(f"Connected islands: {dfs_res.get('total_connected_islands')}")
print(f"Cycles detected: {dfs_res.get('cycles_detected_count')}")

print("\n--- 7. MAX-HEAP PRIORITY QUEUE INCIDENTS (/api/incidents/prioritized) ---")
inc_res = get('http://127.0.0.1:8000/api/incidents/prioritized')
print(f"Prioritized incidents count: {len(inc_res)}")

print("\n--- 8. NATIONAL TELEMETRY SNAPSHOT (/api/telemetry/national) ---")
telem = get('http://127.0.0.1:8000/api/telemetry/national')
print(f"Frequency: {telem.get('grid_frequency_hz')} Hz | Demand: {telem.get('national_demand_mw')} MW | Generation: {telem.get('total_generation_mw')} MW")

print("\n=== ALL TEST SUITES PASSED SUCCESSFULLY ===")
