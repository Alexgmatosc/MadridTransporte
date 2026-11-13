#!/usr/bin/env python3
"""
Generate official Renfe Cercanías Madrid (Núcleo 10) datasets by fetching and reconciling:
1. CRTM Cercanías Madrid GTFS (ArcGIS item 1a25440bf66f499bae2657ec7fb40144)
2. Renfe Cercanías GTFS (fomento_transit.zip, filtered to Núcleo 10)

Outputs:
- public/data/cercanias_stations.json: compact station catalog (<50 KB)
- public/data/cercanias_meta.json: compact routeId & stopId lookup (<30 KB)
"""
import csv
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict

CRTM_GTFS_URL = "https://www.arcgis.com/sharing/rest/content/items/1a25440bf66f499bae2657ec7fb40144/data"
RENFE_GTFS_URL = "https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIONS_OUTPUT = os.path.join(BASE_DIR, "public", "data", "cercanias_stations.json")
META_OUTPUT = os.path.join(BASE_DIR, "public", "data", "cercanias_meta.json")

# Known stop_id aliases between CRTM GTFS and Renfe GTFS / GTFS-RT (e.g., Vallecas: 70005 in Renfe, 70001 in CRTM)
STATION_ID_ALIASES = {
    "70001": "70005",
}

# Canonical station name overrides for route_long_name endpoint cleanup
ENDPOINT_NAME_ALIASES = {
    "principe pio": "Madrid-Príncipe Pío",
    "madrid-principe pio": "Madrid-Príncipe Pío",
    "aeropuerto-t4": "Madrid-Aeropuerto T4",
    "aeropuerto t4": "Madrid-Aeropuerto T4",
    "madrid-aeropuerto t4": "Madrid-Aeropuerto T4",
    "chamartin - clara campoamor": "Madrid-Chamartín-Clara Campoamor",
    "chamartin-clara campoamor": "Madrid-Chamartín-Clara Campoamor",
    "madrid-chamartin-clara campoamor": "Madrid-Chamartín-Clara Campoamor",
    "atocha": "Madrid-Atocha Cercanías",
    "madrid-atocha cercanias": "Madrid-Atocha Cercanías",
    "nuevos ministerios": "Madrid-Nuevos Ministerios",
    "madrid-nuevos ministerios": "Madrid-Nuevos Ministerios",
    "recoletos": "Madrid-Recoletos",
    "villalba": "Villalba de Guadarrama",
    "mostoles el soto": "Móstoles-El Soto",
    "mostoles-el soto": "Móstoles-El Soto",
    "alcala de henares": "Alcalá de Henares",
    "alcobendas-s.sebast. de los reyes": "Alcobendas-San Sebastián de los Reyes",
    "cotos": "Los Cotos",
}


def download_zip(url: str, label: str) -> zipfile.ZipFile:
    print(f"Downloading {label} from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        raw = resp.read()
    print(f"  Downloaded {len(raw)} bytes.")
    return zipfile.ZipFile(io.BytesIO(raw))


def read_gtfs_csv(zf: zipfile.ZipFile, filename: str) -> list[dict[str, str]]:
    with zf.open(filename) as f:
        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig", errors="replace"))
        rows: list[dict[str, str]] = []
        for row in reader:
            cleaned = {
                (k.strip() if k else ""): (v.strip() if v else "")
                for k, v in row.items()
                if k is not None
            }
            if any(cleaned.values()):
                rows.append(cleaned)
        return rows


def normalize_key(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text)
    stripped = "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", stripped).strip().lower()


def line_sort_key(line: str) -> tuple[int, str]:
    m = re.match(r"^C?(\d+)(.*)$", line, re.IGNORECASE)
    if m:
        return (int(m.group(1)), m.group(2).lower())
    return (999, line)


def clean_endpoint_name(raw: str, stop_lookup_by_norm: dict[str, str]) -> str:
    trimmed = raw.strip()
    if not trimmed:
        return ""
    norm = normalize_key(trimmed)
    if norm in ENDPOINT_NAME_ALIASES:
        return ENDPOINT_NAME_ALIASES[norm]
    if norm in stop_lookup_by_norm:
        return stop_lookup_by_norm[norm]
    return trimmed


def parse_route_long_name(long_name: str, stop_lookup_by_norm: dict[str, str]) -> tuple[str, str]:
    if not long_name:
        return ("", "")
    # Renfe/CRTM route_long_name pads origin to ~40 chars before '-' (e.g. "Chamartín - Clara Campoamor             -Guadalajara")
    # Also handle "-Fuenlabrada" and "Cercedilla                              -"
    if long_name.startswith("-"):
        origin_raw = ""
        dest_raw = long_name[1:]
    else:
        m = re.split(r"\s{2,}-", long_name, maxsplit=1)
        if len(m) == 2:
            origin_raw, dest_raw = m[0], m[1]
        elif long_name.endswith("-"):
            origin_raw, dest_raw = long_name[:-1], ""
        elif " - " in long_name:
            parts = long_name.split(" - ", 1)
            origin_raw, dest_raw = parts[0], parts[1]
        else:
            parts = long_name.split("-", 1)
            origin_raw = parts[0]
            dest_raw = parts[1] if len(parts) == 2 else ""

    return (
        clean_endpoint_name(origin_raw, stop_lookup_by_norm),
        clean_endpoint_name(dest_raw, stop_lookup_by_norm),
    )


def extract_feed_data(zf: zipfile.ZipFile, nucleo_filter: str | None = None):
    routes_rows = read_gtfs_csv(zf, "routes.txt")
    routes: dict[str, dict[str, str]] = {}
    for r in routes_rows:
        rid = r.get("route_id", "")
        if not rid:
            continue
        if nucleo_filter and not rid.startswith(nucleo_filter):
            continue
        routes[rid] = r

    stops_rows = read_gtfs_csv(zf, "stops.txt")
    stops: dict[str, dict[str, str]] = {
        s["stop_id"]: s for s in stops_rows if s.get("stop_id")
    }

    trips_rows = read_gtfs_csv(zf, "trips.txt")
    trip_to_route: dict[str, str] = {}
    for t in trips_rows:
        rid = t.get("route_id", "")
        tid = t.get("trip_id", "")
        if tid and rid in routes:
            trip_to_route[tid] = rid

    trip_stops: dict[str, list[tuple[int, str]]] = defaultdict(list)
    with zf.open("stop_times.txt") as f:
        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig", errors="replace"))
        # Pre-strip fieldnames once for speed over large stop_times.txt
        if reader.fieldnames:
            reader.fieldnames = [fn.strip() if fn else "" for fn in reader.fieldnames]
        for row in reader:
            tid = (row.get("trip_id") or "").strip()
            if tid in trip_to_route:
                sid = (row.get("stop_id") or "").strip()
                seq_str = (row.get("stop_sequence") or "0").strip()
                try:
                    seq = int(seq_str)
                except ValueError:
                    seq = 0
                if sid:
                    trip_stops[tid].append((seq, sid))

    stop_lines: dict[str, set[str]] = defaultdict(set)
    route_trip_od: dict[str, set[tuple[str, str]]] = defaultdict(set)

    for tid, seq_list in trip_stops.items():
        seq_list.sort(key=lambda x: x[0])
        rid = trip_to_route[tid]
        line = routes[rid].get("route_short_name", "").strip()
        if line:
            for _, sid in seq_list:
                canon_sid = STATION_ID_ALIASES.get(sid, sid)
                stop_lines[canon_sid].add(line)
        orig_sid = seq_list[0][1]
        dest_sid = seq_list[-1][1]
        orig_name = stops.get(orig_sid, {}).get("stop_name", "")
        dest_name = stops.get(dest_sid, {}).get("stop_name", "")
        if orig_name or dest_name:
            route_trip_od[rid].add((orig_name, dest_name))

    return routes, stops, stop_lines, route_trip_od


def main() -> None:
    zf_crtm = download_zip(CRTM_GTFS_URL, "CRTM Cercanías Madrid GTFS")
    zf_renfe = download_zip(RENFE_GTFS_URL, "Renfe Cercanías GTFS")

    crtm_routes, crtm_stops, crtm_stop_lines, crtm_route_od = extract_feed_data(zf_crtm, None)
    renfe_routes, renfe_stops, renfe_stop_lines, renfe_route_od = extract_feed_data(zf_renfe, "10")

    print(
        f"CRTM: {len(crtm_routes)} routes, {len(crtm_stops)} stops | "
        f"Renfe Núcleo 10: {len(renfe_routes)} routes, {len(renfe_stop_lines)} active stops"
    )

    # Reconcile all Núcleo 10 stops (prefer Renfe canonical IDs such as 70005 for Vallecas, while retaining 70001 alias)
    all_raw_stop_ids = set(crtm_stops.keys()) | set(renfe_stop_lines.keys())
    station_id_groups: dict[str, list[str]] = defaultdict(list)
    for raw_sid in sorted(all_raw_stop_ids):
        canon = STATION_ID_ALIASES.get(raw_sid, raw_sid)
        if raw_sid not in station_id_groups[canon]:
            station_id_groups[canon].append(raw_sid)

    stations: list[dict] = []
    meta_stops: dict[str, str] = {}

    for canon_id in sorted(station_id_groups.keys()):
        raw_ids = sorted(station_id_groups[canon_id], key=lambda x: (0 if x == canon_id else 1, x))
        # Prefer Renfe stop metadata first (matches GTFS-RT stopId), then CRTM
        stop_row = renfe_stops.get(canon_id) or crtm_stops.get(canon_id)
        if not stop_row:
            for alt_id in raw_ids:
                stop_row = renfe_stops.get(alt_id) or crtm_stops.get(alt_id)
                if stop_row:
                    break
        if not stop_row:
            continue

        name = stop_row.get("stop_name", "").strip()
        try:
            lat = round(float(stop_row.get("stop_lat", "0")), 6)
            lon = round(float(stop_row.get("stop_lon", "0")), 6)
        except ValueError:
            lat, lon = 0.0, 0.0

        if not name or (lat == 0.0 and lon == 0.0):
            continue

        # Merge serving lines from both CRTM and Renfe feeds
        lines_set = set(crtm_stop_lines.get(canon_id, set())) | set(renfe_stop_lines.get(canon_id, set()))
        for alt_id in raw_ids:
            lines_set |= set(crtm_stop_lines.get(alt_id, set())) | set(renfe_stop_lines.get(alt_id, set()))

        sorted_lines = sorted(lines_set, key=line_sort_key)

        station_entry: dict = {
            "id": canon_id,
            "name": name,
            "lat": lat,
            "lon": lon,
            "lines": sorted_lines,
            "stopIds": raw_ids,
        }
        zone = stop_row.get("zone_id", "").strip()
        if zone:
            station_entry["zone"] = zone

        stations.append(station_entry)

        for sid in raw_ids:
            meta_stops[sid] = name

    stations.sort(key=lambda s: s["name"])

    # Build lookup by normalized station name for cleaning route_long_name endpoints
    stop_lookup_by_norm: dict[str, str] = {
        normalize_key(s["name"]): s["name"] for s in stations
    }

    # Build routeId -> { line, origin, destination } from merged routes (Renfe has all 41 Núcleo 10 routes)
    all_routes = {**crtm_routes, **renfe_routes}
    meta_routes: dict[str, dict[str, str]] = {}
    for rid in sorted(all_routes.keys()):
        r = all_routes[rid]
        line = r.get("route_short_name", "").strip()
        origin, destination = parse_route_long_name(r.get("route_long_name", ""), stop_lookup_by_norm)

        # Fallback to actual trip endpoints when route_long_name is incomplete
        if not origin or not destination:
            od_candidates = sorted(renfe_route_od.get(rid) or crtm_route_od.get(rid) or [])
            if od_candidates:
                if not origin and od_candidates[0][0]:
                    origin = od_candidates[0][0]
                if not destination and od_candidates[0][1]:
                    destination = od_candidates[0][1]

        meta_routes[rid] = {
            "line": line,
            "origin": origin,
            "destination": destination,
        }

    os.makedirs(os.path.dirname(STATIONS_OUTPUT), exist_ok=True)
    with open(STATIONS_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(stations, f, ensure_ascii=False, separators=(",", ":"))

    meta_payload = {
        "routes": meta_routes,
        "stops": dict(sorted(meta_stops.items())),
    }
    with open(META_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(meta_payload, f, ensure_ascii=False, separators=(",", ":"))

    stations_kb = os.path.getsize(STATIONS_OUTPUT) / 1024
    meta_kb = os.path.getsize(META_OUTPUT) / 1024
    print(f"Saved {len(stations)} stations to {STATIONS_OUTPUT} ({stations_kb:.2f} KB)")
    print(f"Saved {len(meta_routes)} routes and {len(meta_stops)} stops to {META_OUTPUT} ({meta_kb:.2f} KB)")

    if stations_kb >= 50:
        print(f"WARNING: cercanias_stations.json exceeds 50 KB ({stations_kb:.2f} KB)", file=sys.stderr)
    if meta_kb >= 30:
        print(f"WARNING: cercanias_meta.json exceeds 30 KB ({meta_kb:.2f} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
