#!/usr/bin/env python3
"""
Generate official Metro de Madrid stations dataset by merging:
1. CRTM Metro stations CSV (290 platform entries)
2. CRTM GTFS stops.txt (WGS84 GPS coordinates and street addresses)
3. Metro de Madrid Teleindicadores live REST service (official station names with Spanish accents)
Outputs to public/data/metro_stations.json
"""
import io
import json
import os
import sys
import urllib.request
import zipfile
import csv
from collections import defaultdict

GTFS_METRO_URL = "https://www.arcgis.com/sharing/rest/content/items/5c7f2951962540d69ffe8f640d94c246/data"
LIVE_TELEINDICADORES_URL = "https://serviciosapp.metromadrid.es/servicios/rest/teleindicadores"
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", ".agents", "teamwork", "explorer_survey_3", "metro_stations.csv")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "data", "metro_stations.json")

# Verified active master codes for all 37 multi-line interchange stations
# Queried live and verified by explorer_survey_3 handoff.md § 1.4
MASTER_CODE_OVERRIDES = {
    'SOL': '0112',
    'NUEVOS MINISTERIOS': '0618',
    'AVENIDA DE AMERICA': '0411',
    'PRINCIPE PIO': '0625',
    'OPERA': '0209',
    'PINAR DE CHAMARTIN': '0153',
    'PLAZA DE CASTILLA': '0101',
    'ALONSO MARTINEZ': '0404',
    'DIEGO DE LEON': '0410',
    'CUATRO CAMINOS': '0106',
    'CHAMARTIN': '0151',
    'TRIBUNAL': '0110',
    'GRAN VIA': '0111',
    'BILBAO': '0109',
    'PACIFICO': '0118',
    'SAN BERNARDO': '0212',
    'GOYA': '0203',
    'MANUEL BECERRA': '0202',
    'VENTAS': '0201',
    'PRINCIPE DE VERGARA': '0204',
    'CANAL': '0214',
    'CALLAO': '0307',
    'PLAZA DE ESPAÑA': '0308',
    'ARGÜELLES': '0310',
    'MONCLOA': '0311',
    'LEGAZPI': '0301',
    'MAR DE CRISTAL': '0418',
    'PUEBLO NUEVO': '0505',
    'NUÑEZ DE BALBOA': '0510',
    'OPORTO': '0523',
    'CASA DE CAMPO': '0530',
    'PLAZA ELIPTICA': '0605',
    'SAINZ DE BARANDA': '0612',
    'GUZMAN EL BUENO': '0620',
    'GREGORIO MARAÑON': '0711',
    'COLOMBIA': '0802',
    'PUERTA DEL SUR': '1021',
}

FALLBACK_PROPER_NAMES = {
    'CARPETANA': 'Carpetana',
    'SAN CIPRIANO': 'San Cipriano',
    'SANTIAGO BERNABEU': 'Santiago Bernabéu',
}

def download_data(url: str, description: str, accept_json: bool = False) -> bytes:
    print(f"Downloading {description} from {url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    if accept_json:
        headers["Accept"] = "application/json"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=40) as response:
        data = response.read()
    print(f"Downloaded {len(data)} bytes.")
    return data

def main():
    # 1. Download & parse GTFS stops.txt
    gtfs_bytes = download_data(GTFS_METRO_URL, "GTFS Metro zip")
    zf = zipfile.ZipFile(io.BytesIO(gtfs_bytes))

    gtfs_stops = {}
    with zf.open("stops.txt") as f:
        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
        for row in reader:
            stop_id = row.get("stop_id", "").strip()
            if stop_id:
                gtfs_stops[stop_id] = row
    print(f"Parsed {len(gtfs_stops)} stops from GTFS stops.txt")

    # 2. Try fetching live teleindicadores names for exact accentuation
    live_names_by_id = {}
    try:
        live_json_bytes = download_data(LIVE_TELEINDICADORES_URL, "live teleindicadores names", accept_json=True)
        live_data = json.loads(live_json_bytes.decode("utf-8"))
        for it in live_data.get("Vtelindicadores", []):
            cid = it.get("idnumerica")
            if cid is not None:
                live_names_by_id[int(cid)] = it.get("nombreest", "").strip()
        print(f"Extracted {len(live_names_by_id)} station names from live teleindicadores")
    except Exception as e:
        print(f"Warning: could not fetch live teleindicadores names ({e}). Using title case fallback.")

    # 3. Read CRTM CSV
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        sys.exit(1)

    with open(CSV_PATH, encoding="utf-8") as f:
        csv_rows = list(csv.DictReader(f))
    print(f"Read {len(csv_rows)} platform rows from {CSV_PATH}")

    # 4. Group by physical station (DENOMINACION)
    by_denom = defaultdict(list)
    for r in csv_rows:
        by_denom[r["DENOMINACION"].strip()].append(r)

    print(f"Found {len(by_denom)} unique physical station names")

    stations = []
    for denom, rows in sorted(by_denom.items()):
        master_code = MASTER_CODE_OVERRIDES.get(denom)
        if not master_code:
            master_code = rows[0]["CODIGOEMPRESA"].strip()

        # Station name resolution
        station_name = FALLBACK_PROPER_NAMES.get(denom)
        if not station_name:
            for r in rows:
                cid = int(r["CODIGOEMPRESA"])
                if cid in live_names_by_id:
                    station_name = live_names_by_id[cid]
                    break
        if not station_name:
            station_name = denom.title()

        # Collect serving lines
        lines_set = set()
        for r in rows:
            lines_str = r.get("LINEAS", "").strip()
            for p in lines_str.split(","):
                p = p.strip()
                if p:
                    lines_set.add(p)

        if denom == "PINAR DE CHAMARTIN":
            lines_set.add("ML1")
        elif denom == "COLONIA JARDIN":
            lines_set.add("ML2")
            lines_set.add("ML3")

        def line_sort_key(x: str):
            if x.isdigit():
                return (0, int(x))
            if x == "R":
                return (1, 0)
            return (2, x)

        sorted_lines = sorted(lines_set, key=line_sort_key)
        all_codes = sorted(list(set(r["CODIGOEMPRESA"].strip() for r in rows)))

        # Representative platform for coords and address
        rep_row = next((r for r in rows if r["CODIGOEMPRESA"].strip() == master_code), rows[0])
        gtfs_entry = gtfs_stops.get("par_" + rep_row["IDESTACION"].strip(), {})

        try:
            lat = round(float(gtfs_entry.get("stop_lat", 0)), 5)
            lon = round(float(gtfs_entry.get("stop_lon", 0)), 5)
        except (ValueError, TypeError):
            lat = 0.0
            lon = 0.0

        address = gtfs_entry.get("stop_desc", "").strip()
        zone = gtfs_entry.get("zone_id", "").strip() or "A"

        stations.append({
            "id": master_code,
            "name": station_name,
            "address": address,
            "lat": lat,
            "lon": lon,
            "lines": sorted_lines,
            "allCodes": all_codes,
            "zone": zone,
        })

    # Sort stations alphabetically by name
    stations.sort(key=lambda s: s["name"])

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(stations, f, ensure_ascii=False, indent=2)

    file_size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"Saved {len(stations)} stations to {OUTPUT_FILE} ({file_size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
