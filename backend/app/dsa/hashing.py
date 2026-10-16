"""
DSA Multi-Key Hash Table & Indexing Engine.
Provides O(1) average-time lookups for assets across multiple search dimensions:
- Asset ID
- Operator Code
- State
- District
- Pincode
- Asset Type
"""
from typing import Dict, List, Optional, Any, Set
from collections import defaultdict


class AssetIndexTable:
    """
    In-memory multi-key inverted index hash table for high-throughput lookup.
    """
    def __init__(self):
        self.by_id: Dict[str, Dict[str, Any]] = {}
        self.by_pincode: Dict[str, List[str]] = defaultdict(list)
        self.by_state: Dict[str, List[str]] = defaultdict(list)
        self.by_district: Dict[str, List[str]] = defaultdict(list)
        self.by_operator: Dict[str, List[str]] = defaultdict(list)
        self.by_type: Dict[str, List[str]] = defaultdict(list)
        self.all_ids: Set[str] = set()

    def clear(self):
        self.by_id.clear()
        self.by_pincode.clear()
        self.by_state.clear()
        self.by_district.clear()
        self.by_operator.clear()
        self.by_type.clear()
        self.all_ids.clear()

    def insert_asset(self, asset: Dict[str, Any]):
        aid = asset.get("id")
        if not aid:
            return
        
        self.by_id[aid] = asset
        self.all_ids.add(aid)

        # Index by pincode
        pincode = str(asset.get("pincode", "")).strip()
        if pincode and pincode not in ("None", "null", ""):
            if aid not in self.by_pincode[pincode]:
                self.by_pincode[pincode].append(aid)

        # Index by state (normalized lowercase for fast case-insensitive lookup)
        state = str(asset.get("state", "")).strip().lower()
        if state:
            if aid not in self.by_state[state]:
                self.by_state[state].append(aid)

        # Index by district
        district = str(asset.get("district", "")).strip().lower()
        if district:
            if aid not in self.by_district[district]:
                self.by_district[district].append(aid)

        # Index by operator
        operator = str(asset.get("operator", "")).strip().upper()
        if operator:
            if aid not in self.by_operator[operator]:
                self.by_operator[operator].append(aid)

        # Index by type
        atype = str(asset.get("type", "")).strip().lower()
        if atype:
            if aid not in self.by_type[atype]:
                self.by_type[atype].append(aid)

    def get_by_id(self, aid: str) -> Optional[Dict[str, Any]]:
        return self.by_id.get(aid)

    def search_by_pincode(self, pincode: str) -> List[Dict[str, Any]]:
        clean_pin = str(pincode).strip()
        aids = self.by_pincode.get(clean_pin, [])
        return [self.by_id[aid] for aid in aids if aid in self.by_id]

    def search_by_state(self, state: str) -> List[Dict[str, Any]]:
        key = state.strip().lower()
        aids = self.by_state.get(key, [])
        return [self.by_id[aid] for aid in aids if aid in self.by_id]

    def search_by_district(self, district: str) -> List[Dict[str, Any]]:
        key = district.strip().lower()
        aids = self.by_district.get(key, [])
        return [self.by_id[aid] for aid in aids if aid in self.by_id]

    def search_by_operator(self, operator: str) -> List[Dict[str, Any]]:
        key = operator.strip().upper()
        aids = self.by_operator.get(key, [])
        return [self.by_id[aid] for aid in aids if aid in self.by_id]

    def search_by_type(self, asset_type: str) -> List[Dict[str, Any]]:
        key = asset_type.strip().lower()
        aids = self.by_type.get(key, [])
        return [self.by_id[aid] for aid in aids if aid in self.by_id]

    def general_search(self, query: str) -> List[Dict[str, Any]]:
        """
        Multi-attribute instant query lookup across ID, Name, State, District, Pincode.
        """
        q = query.strip().lower()
        if not q:
            return list(self.by_id.values())

        matched_ids: Set[str] = set()

        # Exact / prefix pincode check
        if q.isdigit():
            for pin, aids in self.by_pincode.items():
                if pin.startswith(q):
                    matched_ids.update(aids)

        # State check
        for state_key, aids in self.by_state.items():
            if q in state_key:
                matched_ids.update(aids)

        # District check
        for dist_key, aids in self.by_district.items():
            if q in dist_key:
                matched_ids.update(aids)

        # Operator check
        for op_key, aids in self.by_operator.items():
            if q.upper() in op_key:
                matched_ids.update(aids)

        # Direct name / id check
        for aid, asset in self.by_id.items():
            name = str(asset.get("name", "")).lower()
            if q in aid.lower() or q in name:
                matched_ids.add(aid)

        return [self.by_id[aid] for aid in matched_ids if aid in self.by_id]
