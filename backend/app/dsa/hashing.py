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

    def search_by_name(self, name_query: str) -> List[Dict[str, Any]]:
        return self.general_search(name_query)


class _TrieNode:
    def __init__(self) -> None:
        self.children: Dict[str, "_TrieNode"] = {}
        self.asset_ids: List[str] = []


class PincodeTrie:
    """Prefix Trie for O(L) prefix autocomplete on substation codes and pincodes."""

    def __init__(self) -> None:
        self.root = _TrieNode()

    def insert(self, key: str, asset_id: str) -> None:
        node = self.root
        for ch in str(key).upper():
            if ch not in node.children:
                node.children[ch] = _TrieNode()
            node = node.children[ch]
            if asset_id not in node.asset_ids:
                node.asset_ids.append(asset_id)

    def search_prefix(self, prefix: str) -> List[str]:
        node = self.root
        for ch in str(prefix).upper():
            if ch not in node.children:
                return []
            node = node.children[ch]
        return list(node.asset_ids)


class CircularTelemetryBuffer:
    """Fixed-capacity O(1) circular ring buffer for high-rate PMU synchrophasor streams."""

    def __init__(self, capacity: int = 16) -> None:
        self.capacity = max(1, capacity)
        self._buf: List[Optional[Dict[str, Any]]] = [None] * self.capacity
        self._write_ptr: int = 0
        self._count: int = 0

    def append(self, sample: Dict[str, Any]) -> None:
        self._buf[self._write_ptr] = sample
        self._write_ptr = (self._write_ptr + 1) % self.capacity
        self._count = min(self.capacity, self._count + 1)

    def get_latest(self, n: int = 8) -> List[Dict[str, Any]]:
        k = min(n, self._count)
        out: List[Dict[str, Any]] = []
        for i in range(k):
            idx = (self._write_ptr - 1 - i) % self.capacity
            val = self._buf[idx]
            if val is not None:
                out.append(val)
        out.reverse()
        return out

