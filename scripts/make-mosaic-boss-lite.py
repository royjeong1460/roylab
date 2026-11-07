#!/usr/bin/env python3
"""Author one reduced-pixel candidate from JSON; never execute game physics."""
import argparse
from collections import Counter, deque
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
CODEC = runpy.run_path(str(ROOT / "scripts/compact-map-data.py"))
GEOMETRY = runpy.run_path(str(ROOT / "scripts/repair-floor-standing-maps.py"))
SITE_ID = "mosaic-boss-mosaic-terrain-frame-v1"
BASELINE_SHA256 = "7ce4023becac3175e88901a1eda862843b506662490e468b07f358dcad6f185c"


def scaled(edge):
    return (int(edge) * 4 + 2) // 5


def assemblies(data):
    width = data["width"]
    remaining = {i for i, cell in enumerate(data["cells"]) if cell}
    sizes = []
    while remaining:
        start = min(remaining)
        remaining.remove(start)
        queue = deque([start])
        count = 0
        while queue:
            cell = queue.popleft()
            count += 1
            neighbors = [cell - width, cell + width]
            if cell % width:
                neighbors.append(cell - 1)
            if cell % width < width - 1:
                neighbors.append(cell + 1)
            for neighbor in neighbors:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    queue.append(neighbor)
        sizes.append(count)
    return sizes


def reduce_map(source):
    assert source["id"] == SITE_ID
    assert (source["width"], source["height"], source["initial"]) == (640, 512, 47156)
    before = GEOMETRY["inspect_geometry"](source)
    data = deepcopy(source)
    old_width, old_height = source["width"], source["height"]
    width, height = scaled(old_width), scaled(old_height)
    data.update(width=width, height=height, floor_y=scaled(source["floor_y"]))
    for field in ["cells", "roles", "colors"]:
        data[field] = [0] * (width * height)
    for y in range(height):
        old_y = min(old_height - 1, (y * 10 + 5) // 8)
        for x in range(width):
            old_x = min(old_width - 1, (x * 10 + 5) // 8)
            old_id, cell = old_y * old_width + old_x, y * width + x
            for field in ["cells", "roles", "colors"]:
                data[field][cell] = source[field][old_id]

    # Keep the original two-cell supports legible; blind sampling can make them one.
    pillars = []
    for module in source["modules"]:
        if module["type"] != "pillar":
            continue
        xs = [p % old_width for p in module["pixels"]]
        ys = [p // old_width for p in module["pixels"]]
        left, top, right, bottom = min(xs), min(ys), max(xs) + 1, max(ys) + 1
        assert len(xs) == (right - left) * (bottom - top), "Non-rectangular pillar needs author review"
        x0, x1 = scaled(left), max(scaled(right), scaled(left) + 2)
        y0, y1 = scaled(top), scaled(bottom)
        assert 0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height
        for y in range(y0, y1):
            old_y = min(bottom - 1, max(top, (y * 10 + 5) // 8))
            for x in range(x0, x1):
                cell = y * width + x
                assert not data["cells"][cell] or data["roles"][cell] == 1, "Pillar overlaps another role"
                old_x = min(right - 1, max(left, (x * 10 + 5) // 8))
                old_id = old_y * old_width + old_x
                for field in ["cells", "roles", "colors"]:
                    data[field][cell] = source[field][old_id]
        pillars.append({"before": [left, top, right-left, bottom-top],
                        "after": [x0, y0, x1-x0, y1-y0]})

    data["terrain"] = [{"x": scaled(s["x"]), "w": scaled(s["x"] + s["w"]) - scaled(s["x"]),
                        "y": scaled(s["y"])} for s in source["terrain"]]
    assert sum(s["w"] for s in data["terrain"]) == width
    data["preview"] = [{**p, "x": scaled(p["x"]), "y": scaled(p["y"] + 1) - 1}
                       for p in source["preview"]]
    GEOMETRY["rebuild_topology"](data)
    data["initial"] = sum(bool(c) for c in data["cells"])
    after = GEOMETRY["inspect_geometry"](data)
    assert 0.60 <= data["initial"] / source["initial"] <= 0.70
    assert after["buried_cells"] == after["cliff_side_contacts"] == after["ungrounded_cells"] == 0
    assert Counter(m["type"] for m in data["modules"]) == Counter(m["type"] for m in source["modules"])
    old_assemblies, new_assemblies = assemblies(source), assemblies(data)
    assert len(old_assemblies) == len(new_assemblies)
    assert len(data["module_links"]) == len(source["module_links"])
    assert all(data["cells"][p["y"] * width + p["x"]] for p in data["preview"])
    for key in ["id", "map_id", "name", "region", "boss", "layout_key", "actions", "description", "hint"]:
        assert data[key] == source[key]
    return data, {"before": before, "after": after, "pillars": pillars,
                  "before_assemblies": old_assemblies, "after_assemblies": new_assemblies,
                  "grid_before": [old_width, old_height], "grid_after": [width, height],
                  "pixel_reduction_fraction": 1 - data["initial"] / source["initial"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-boss", type=Path, required=True)
    parser.add_argument("--source-campaign", type=Path, required=True)
    parser.add_argument("--output-boss", type=Path, required=True)
    parser.add_argument("--output-campaign", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    raw = args.source_boss.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == BASELINE_SHA256, "Use the preserved0.5.50 boss as input"
    original = CODEC["unpack"](json.loads(raw))
    candidate, report = reduce_map(original)
    output = CODEC["encode"](CODEC["pack"](candidate))
    assert CODEC["unpack"](json.loads(output)) == candidate
    campaign = json.loads(args.source_campaign.read_bytes())
    old_campaign = deepcopy(campaign)
    meta = next(s for s in campaign["sites"] if s["id"] == SITE_ID)
    meta.update(width=candidate["width"], height=candidate["height"], floor_y=candidate["floor_y"],
                initial=candidate["initial"], terrain=candidate["terrain"],
                record_total_limit=max(meta.get("record_total_limit", 0), original["initial"]))
    assert all(a == b for a, b in zip(old_campaign["sites"], campaign["sites"]) if a["id"] != SITE_ID)
    report.update(site=SITE_ID, source_sha256=hashlib.sha256(raw).hexdigest(),
                  output_sha256=hashlib.sha256(output).hexdigest(), encoded_bytes=len(output),
                  scope="Static authored file data only; no physics, scene or game execution.",
                  public_release=False, per_pixel_reward_unchanged=True, boss_bonuses_unchanged=True)
    for path, content in [(args.output_boss, output), (args.output_campaign, CODEC["encode"](campaign)),
                          (args.report, (json.dumps(report, indent=2) + "\n").encode())]:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    print(json.dumps({k: report[k] for k in ["before", "after", "grid_before", "grid_after", "pixel_reduction_fraction"]}, indent=2))


if __name__ == "__main__":
    main()
