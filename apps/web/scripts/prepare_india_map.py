"""Prepare local SVG paths and grid metadata from reference source files.

Usage: python3 scripts/prepare_india_map.py /path/to/india.geojson
Boundary source: https://github.com/udit-001/india-maps-data
Whole-country GeoJSON: geojson/india.geojson (downloaded 2026-10-26).
District geometries are grouped by st_nm, not redrawn or approximated manually.
Projection: linear lon/lat, x=(lon-67)*18, y=(38-lat)*20.
"""
import json
import sys
from pathlib import Path

web = Path(__file__).resolve().parents[1]
repo = web.parents[1]
geo = json.loads(Path(sys.argv[1]).read_text())
groups = {}


def ring_path(ring):
    points = []
    for lon, lat, *_ in ring:
        p = [round((lon - 67) * 18, 1), round((38 - lat) * 20, 1)]
        if not points or p != points[-1]:
            points.append(p)
    return 'M' + 'L'.join(','.join(map(str, p)) for p in points) + 'Z'


for feature in geo['features']:
    geom = feature['geometry']
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    groups.setdefault(feature['properties']['st_nm'], []).extend(
        ring_path(ring) for poly in polys for ring in poly
    )

boundaries = [{'name': name, 'path': ''.join(paths)} for name, paths in groups.items()]
(web / 'src/data/indiaBoundaries.json').write_text(json.dumps(boundaries, separators=(',', ':')))
text = (repo / 'js/data/indiaGridData.js').read_text().split('const INDIA_GRID_DATA = ')[1]
data = json.loads(text[:text.rfind('};') + 1])
keys = ['id', 'name', 'state', 'region', 'lat', 'lon', 'capacityMW', 'voltage']
network = {'nodes': [{k: n[k] for k in keys} for n in data['nodes']], 'corridors': data['corridors']}
(web / 'src/data/indiaNetwork.json').write_text(json.dumps(network, separators=(',', ':')))
