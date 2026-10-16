"""
Incident Prioritization Max-Heap Priority Queue Engine
Ranks grid cybersecurity alerts by severity, asset criticality, risk score, and propagation impact.
"""

import heapq
from typing import List, Dict, Any, Optional

class PrioritizedIncidentItem:
    def __init__(self, incident_dict: Dict[str, Any]):
        self.incident = incident_dict
        
        # Calculate composite priority score (higher score = higher priority in Max-Heap)
        sev = incident_dict.get("severity", "MEDIUM").upper()
        sev_weight = {"CRITICAL": 50.0, "HIGH": 30.0, "MEDIUM": 15.0, "LOW": 5.0, "INFO": 1.0}.get(sev, 10.0)
        risk_score = float(incident_dict.get("risk_score", 50.0))
        criticality = float(incident_dict.get("asset_criticality", 5.0)) * 4.0
        affected_count = float(incident_dict.get("affected_assets_count", 1)) * 3.0

        self.priority_score = sev_weight + (risk_score * 0.3) + criticality + affected_count
        self.incident["calculated_priority_score"] = round(self.priority_score, 1)

    # Max-heap comparator using Python's min-heap with inverted priority
    def __lt__(self, other: 'PrioritizedIncidentItem') -> bool:
        return self.priority_score > other.priority_score

class IncidentPriorityQueue:
    def __init__(self):
        self.heap: List[PrioritizedIncidentItem] = []

    def push(self, incident_dict: Dict[str, Any]):
        heapq.heappush(self.heap, PrioritizedIncidentItem(incident_dict))

    def pop(self) -> Optional[Dict[str, Any]]:
        if not self.heap:
            return None
        return heapq.heappop(self.heap).incident

    def get_all_sorted(self) -> List[Dict[str, Any]]:
        """Returns all incidents ordered from highest priority to lowest with rank."""
        temp_heap = list(self.heap)
        sorted_list = []
        rank = 1
        while temp_heap:
            item = heapq.heappop(temp_heap)
            inc = dict(item.incident)
            inc["priority_rank"] = rank
            sorted_list.append(inc)
            rank += 1
        return sorted_list

    @classmethod
    def prioritize_incidents(cls, incidents_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        pq = cls()
        for inc in incidents_list:
            pq.push(inc)
        return pq.get_all_sorted()
