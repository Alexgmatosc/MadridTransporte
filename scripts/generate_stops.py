#!/usr/bin/env python3
"""
Generate official stops dataset by fetching and merging:
1. GTFS stops.txt from gtfs_emt.zip
2. stopsemt.csv
Outputs to public/data/stops.json
"""
import io
import json
import os
import sys
import urllib.request
import zipfile
import csv

GTFS_URL = "https://datos.emtmadrid.es/dataset/9b23259a-4491-494b-9695-36a7709b2c12/resource/3cba2058-9833-422c-a704-bf992d31d2ee/download/gtfs_emt.zip"
STOPS_CSV_URL = "https://datos.emtmadrid.es/dataset/7b4a2c0a-eece-4a5a-9094-bf9444824d86/resource/4f0736a9-865c-428f-8719-128c805baa2e/download/stopsemt.csv"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "data", "stops.json")

def download_data(url: str, description: str) -> bytes:
    print(f"Downloading {description} from {url}...")
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as response:
        data = response.read()
    print(f"Downloaded {len(data)} bytes.")
    return data

def main():
    # 1. Download & parse GTFS stops.txt
    gtfs_bytes = download_data(GTFS_URL, "GTFS EMT zip")
    zf = zipfile.ZipFile(io.BytesIO(gtfs_bytes))
    
    gtfs_stops = {}
    with zf.open("stops.txt") as f:
        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8", errors="replace"))
        for row in reader:
            stop_id = row.get("stop_id", "").strip()
            if not stop_id:
                continue
            name = row.get("stop_name", "").strip()
            try:
                lat = round(float(row.get("stop_lat", 0)), 6)
                lon = round(float(row.get("stop_lon", 0)), 6)
            except ValueError:
                lat = 0.0
                lon = 0.0
            
            gtfs_stops[stop_id] = {
                "id": stop_id,
                "name": name,
                "lat": lat,
                "lon": lon,
            }
    print(f"Parsed {len(gtfs_stops)} stops from GTFS stops.txt")

    # 2. Download & parse stopsemt.csv
    csv_bytes = download_data(STOPS_CSV_URL, "stopsemt.csv")
    csv_text = csv_bytes.decode("utf-8", errors="replace")
    
    csv_stops_info = {}
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    for row in reader:
        parada = row.get("parada", "").strip()
        if not parada:
            continue
        line_label = row.get("label", "").strip()
        descparada = row.get("descparada", "").strip()
        descpostal = row.get("descpostal", "").strip()
        
        if parada not in csv_stops_info:
            csv_stops_info[parada] = {
                "name": descparada,
                "address": descpostal,
                "lines": set()
            }
        
        if line_label:
            csv_stops_info[parada]["lines"].add(line_label)
        if descpostal and not csv_stops_info[parada]["address"]:
            csv_stops_info[parada]["address"] = descpostal
        if descparada and not csv_stops_info[parada]["name"]:
            csv_stops_info[parada]["name"] = descparada

    print(f"Parsed {len(csv_stops_info)} unique stops from stopsemt.csv")

    # 3. Merge datasets
    merged = []
    all_stop_ids = sorted(
        set(gtfs_stops.keys()).union(set(csv_stops_info.keys())),
        key=lambda x: int(x) if x.isdigit() else x
    )

    for stop_id in all_stop_ids:
        gtfs = gtfs_stops.get(stop_id)
        csv_info = csv_stops_info.get(stop_id)

        # Name
        name = ""
        if gtfs and gtfs["name"]:
            name = gtfs["name"]
        elif csv_info and csv_info["name"]:
            name = csv_info["name"]

        # Address
        address = ""
        if csv_info and csv_info["address"]:
            address = csv_info["address"]
        elif name:
            address = name

        # Lat / Lon
        lat = 0.0
        lon = 0.0
        if gtfs:
            lat = gtfs["lat"]
            lon = gtfs["lon"]

        # Skip stops with no coordinates or invalid lat/lon
        if lat == 0.0 and lon == 0.0:
            continue

        # Lines sorted (numerically if numbers, otherwise alphabetically)
        raw_lines = list(csv_info["lines"]) if csv_info else []
        def line_sort_key(l_str):
            num_part = ""
            for c in l_str:
                if c.isdigit():
                    num_part += c
                else:
                    break
            val = int(num_part) if num_part else 9999
            return (val, l_str)
        lines = sorted(raw_lines, key=line_sort_key)

        merged.append({
            "id": stop_id,
            "name": name,
            "address": address,
            "lat": lat,
            "lon": lon,
            "lines": lines
        })

    print(f"Total merged valid stops: {len(merged)}")
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=None, separators=(',', ':'))

    file_size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"Saved {OUTPUT_FILE} ({file_size_kb:.1f} KB)")

    # Print sample stop
    sample = next((s for s in merged if s["id"] == "72"), merged[0] if merged else None)
    print("Sample stop 72:", sample)

if __name__ == "__main__":
    main()
