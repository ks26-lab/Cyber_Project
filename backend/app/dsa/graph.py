"""
Power Grid Graph Topology Data Structure
Represents G = (V, E) where V = Grid Assets (Substations, Plants), E = Corridors (HVDC, 765kV, 400kV).
"""

from typing import Dict, List, Set, Optional, Any
import copy

class GraphNode:
    def __init__(
        self,
        node_id: str = "",
        name: str = "",
        node_type: str = "SUBSTATION",
        capacity_mw: float = 0.0,
        current_mw: float = 0.0,
        voltage_kv: str = "",
        latitude: float = 0.0,
        longitude: float = 0.0,
        state: str = "",
        district: str = "",
        pincode: str = "",
        operator: str = "PGCIL",
        status: str = "HEALTHY",
        risk_score: float = 0.0,
        cyber_risk_score: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
        id: Optional[str] = None,
        type: Optional[str] = None
    ):
        self.id = id or node_id or ""
        self.name = name
        self.type = type or node_type or "SUBSTATION"
        self.capacity_mw = capacity_mw
        self.current_mw = current_mw
        self.voltage_kv = voltage_kv
        self.latitude = latitude
        self.longitude = longitude
        self.state = state
        self.district = district
        self.pincode = pincode
        self.operator = operator
        self.status = status # HEALTHY, COMPROMISED, ISOLATED, BLOCKED
        self.risk_score = risk_score or cyber_risk_score or 0.0
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "capacity_mw": self.capacity_mw,
            "current_mw": self.current_mw,
            "voltage_kv": self.voltage_kv,
            "lat": self.latitude,
            "lon": self.longitude,
            "state": self.state,
            "district": self.district,
            "pincode": self.pincode,
            "operator": self.operator,
            "risk_score": self.risk_score,
            "status": self.status,
            "metadata": self.metadata
        }

class GraphEdge:
    def __init__(
        self,
        line_id: str = "",
        source: str = "",
        target: str = "",
        line_type: str = "765kV_AC",
        voltage_kv: str = "765 kV", 
        capacity_mw: float = 1000.0,
        distance_km: float = 100.0,
        risk_factor: float = 1.0,
        current_flow_mw: float = 0.0,
        status: str = "HEALTHY",
        direction: str = "Bidirectional",
        operator: str = "PGCIL",
        id: Optional[str] = None,
        source_id: Optional[str] = None,
        target_id: Optional[str] = None
    ):
        self.line_id = line_id or id or ""
        self.source = source or source_id or ""
        self.target = target or target_id or ""
        self.line_type = line_type
        self.voltage_kv = voltage_kv
        self.capacity_mw = capacity_mw
        self.distance_km = distance_km
        self.risk_factor = risk_factor
        self.current_flow_mw = current_flow_mw
        self.status = status # HEALTHY, ACTIVE, COMPROMISED, DISCONNECTED, BLOCKED
        self.direction = direction
        self.operator = operator

    def get_weight(self, mode: str = "distance") -> float:
        """
        Configurable weight metric calculation:
        - 'distance': Physical line length (km)
        - 'risk': Cyber threat risk factor (1.0 to 100.0)
        - 'capacity': Inverse capacity headroom (penalizes crowded lines)
        - 'balanced': Multi-objective composite weight
        """
        status_up = self.status.upper()
        if status_up in ("DISCONNECTED", "BLOCKED", "ISOLATED"):
            return float('inf')

        # Add heavy penalty if edge is compromised
        risk_penalty = 50.0 if status_up == "COMPROMISED" else (self.risk_factor * 2.0)

        if mode == "distance":
            return max(1.0, self.distance_km) + (risk_penalty * 20.0 if status_up == "COMPROMISED" else 0.0)
        elif mode == "risk":
            return max(1.0, risk_penalty * 10.0 + self.distance_km * 0.1)
        elif mode == "capacity":
            headroom = max(10.0, self.capacity_mw - self.current_flow_mw)
            return (10000.0 / headroom) + (self.distance_km * 0.1) + (risk_penalty * 15.0)
        elif mode == "balanced":
            headroom = max(10.0, self.capacity_mw - self.current_flow_mw)
            return (self.distance_km * 0.5) + (risk_penalty * 15.0) + (5000.0 / headroom)
        return max(1.0, self.distance_km)

class GridGraph:
    def __init__(self, is_directed: bool = False):
        self.is_directed = is_directed
        self.nodes: Dict[str, GraphNode] = {}
        self.adjacency: Dict[str, List[GraphEdge]] = {}
        self.edges: Dict[str, GraphEdge] = {}

    def clear(self):
        self.nodes.clear()
        self.adjacency.clear()
        self.edges.clear()

    def add_node(self, node: GraphNode):
        self.nodes[node.id] = node
        if node.id not in self.adjacency:
            self.adjacency[node.id] = []

    def add_edge(self, edge: GraphEdge):
        self.edges[edge.line_id] = edge
        if edge.source not in self.adjacency:
            self.adjacency[edge.source] = []
        if edge.target not in self.adjacency:
            self.adjacency[edge.target] = []

        self.adjacency[edge.source].append(edge)
        
        if not self.is_directed:
            # Bidirectional power flow line
            reverse_edge = GraphEdge(
                line_id=f"{edge.line_id}_REV",
                source=edge.target,
                target=edge.source,
                line_type=edge.line_type,
                voltage_kv=edge.voltage_kv,
                capacity_mw=edge.capacity_mw,
                distance_km=edge.distance_km,
                risk_factor=edge.risk_factor,
                current_flow_mw=edge.current_flow_mw,
                status=edge.status,
                direction=edge.direction,
                operator=edge.operator
            )
            self.adjacency[edge.target].append(reverse_edge)

    def get_neighbors(self, node_id: str) -> List[GraphEdge]:
        return self.adjacency.get(node_id, [])

    def clone(self) -> 'GridGraph':
        """Deep copies graph for non-destructive sandbox resilience simulations."""
        new_graph = GridGraph(is_directed=self.is_directed)
        for n_id, n in self.nodes.items():
            new_graph.add_node(copy.deepcopy(n))
        for e_id, e in self.edges.items():
            new_graph.add_edge(copy.deepcopy(e))
        return new_graph
