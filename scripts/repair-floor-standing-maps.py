#!/usr/bin/env python3
"""Pure JSON authoring repair; never imports or starts a game runtime.

Replay from the original three map files, using --source, --destination and
--report. Input hashes prevent applying this displacement twice. Keep original
inputs outside the published project. All other maps remain untouched.
"""
import argparse
from collections import Counter, deque
from copy import deepcopy
import hashlib
import json
from pathlib import Path


REPAIRS = {
    "terrace-05-terrace-terrain-frame-v1": {
        "sha256": "1010408d07f67feff0f3d6789a3f06c899315b5e3701e6827c85fc4c90b3c029",
        "moves": [([0, 1, 4, 5, 7, 8, 9], 0, -24)],
        "windows": [(220, 244, 6, 8), (350, 244, 6, 8)],
        "legs": [(220, 272, 2, 24), (354, 272, 2, 24)],
        "clearance": (204, 372, 272, 296),
        "description": "A freestanding notched stone hall rests on narrow floor posts, with a T-tongue shrine on short joints above and a separate lower gate.",
    },
    "terrace-06-terrace-terrain-frame-v1": {
        "sha256": "b654d5f09bae8f21a3eedd05ed177c9913b186825d563c01acab61bd67e528a5",
        "moves": [([6, 11], -2, 0)],
        "windows": [], "legs": [],
    },
    "mosaic-06-mosaic-terrain-frame-v1": {
        "sha256": "371b37e3730665ecbb2dd470b2af3d957340fdc1012a2a99ccb5ccc9159fed68",
        "moves": [([0, 1, 2, 4, 6, 8, 9], 0, -24), ([3, 7], -2, 0)],
        "windows": [(326, 282, 6, 8), (480, 282, 6, 8)],
        "legs": [(330, 312, 2, 24), (480, 312, 2, 24)],
        "clearance": (310, 502, 312, 336),
        "description": "A freestanding notched stone hall rests on narrow floor posts beneath an upper tiled T tongue; a separate masonry upright and domed receiver occupy the lower ridge landings.",
    },
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def rect_ids(rect, width):
    x, y, w, h = rect
    return [yy * width + xx for yy in range(y, y + h) for xx in range(x, x + w)]


def rebuild_topology(data):
    # Match src/structure/model.js: connected role groups, then down/right links.
    cells, roles, width = data["cells"], data["roles"], data["width"]
    module_of, modules = [-1] * len(cells), []
    for role, kind in [(1, "pillar"), (2, "body"), (3, "roof")]:
        for start in range(len(cells)):
            if not cells[start] or roles[start] != role or module_of[start] != -1:
                continue
            index, pixels = len(modules), [start]
            module_of[start] = index
            for cell in pixels:
                x = cell % width
                neighbors = ([cell - 1] if x else []) + ([cell + 1] if x < width - 1 else [])
                neighbors += [cell - width, cell + width]
                for neighbor in neighbors:
                    if (0 <= neighbor < len(cells) and cells[neighbor]
                            and roles[neighbor] == role and module_of[neighbor] == -1):
                        module_of[neighbor] = index
                        pixels.append(neighbor)
            modules.append({"type": kind, "pixels": pixels})
    links = {}
    for cell, value in enumerate(cells):
        if not value:
            continue
        for neighbor in [cell + width] + ([cell + 1] if cell % width < width - 1 else []):
            if neighbor >= len(cells) or not cells[neighbor] or module_of[cell] == module_of[neighbor]:
                continue
            key = tuple(sorted((module_of[cell], module_of[neighbor])))
            links.setdefault(key, []).append([cell, neighbor])
    data.update(modules=modules, module_of=module_of, module_links=list(links.values()))


def inspect_geometry(data):
    width, cells = data["width"], data["cells"]
    surface = [data["floor_y"]] * width
    for span in data.get("terrain") or []:
        surface[span["x"]:span["x"] + span["w"]] = [span["y"]] * span["w"]
    occupied = {cell for cell, value in enumerate(cells) if value}
    floor = {cell for cell in occupied if cell // width + 1 == surface[cell % width]}
    buried = [cell for cell in occupied if cell // width >= surface[cell % width]]
    sides = [cell for cell in occupied if
             (cell % width > 0 and cell // width >= surface[cell % width - 1]) or
             (cell % width < width - 1 and cell // width >= surface[cell % width + 1])]
    reached, queue = set(floor), deque(floor)
    while queue:
        cell = queue.popleft()
        neighbors = ([cell - 1] if cell % width else [])
        neighbors += ([cell + 1] if cell % width < width - 1 else [])
        for neighbor in neighbors + [cell - width, cell + width]:
            if neighbor in occupied and neighbor not in reached:
                reached.add(neighbor)
                queue.append(neighbor)
    return {"pixels": len(occupied), "buried_cells": len(buried),
            "cliff_side_contacts": len(sides), "ungrounded_cells": len(occupied - reached),
            "floor_contact_roles": dict(Counter(data["roles"][cell] for cell in floor)),
            "modules": len(data["modules"]), "module_links": len(data["module_links"])}


def repair(original, spec):
    data, width = deepcopy(original), original["width"]
    moves = {}
    for modules, dx, dy in spec["moves"]:
        for module in modules:
            for cell in original["modules"][module]["pixels"]:
                moves[cell] = cell + dx + dy * width
    for field in ["cells", "roles", "colors"]:
        for cell in moves:
            data[field][cell] = 0
    for cell, target in moves.items():
        assert 0 <= target < len(data["cells"]) and not data["cells"][target], "Move collision"
        for field in ["cells", "roles", "colors"]:
            data[field][target] = original[field][cell]
    for rect in spec["windows"]:
        for cell in rect_ids(rect, width):
            assert data["cells"][cell] and data["roles"][cell] == 2, "Window must remove body"
            for field in ["cells", "roles", "colors"]:
                data[field][cell] = 0
    pillar = original["modules"][0]["pixels"][0]
    for rect in spec["legs"]:
        for cell in rect_ids(rect, width):
            assert not data["cells"][cell], "Leg collision"
            data["cells"][cell], data["roles"][cell] = 1, 1
            data["colors"][cell] = original["colors"][pillar]
    for point in data["preview"]:
        cell = int(point["y"]) * width + int(point["x"])
        if cell in moves:
            target = moves[cell]
            point.update(x=target % width, y=target // width)
    data["preview"] = ([{"x": x, "y": y + h // 2} for x, y, _, h in spec["legs"]]
                       + data["preview"])[:8]
    if "description" in spec:
        data["description"] = data["hint"] = spec["description"]
    rebuild_topology(data)
    for key in ["schema_version", "id", "map_id", "initial", "region", "boss", "width", "height", "floor_y", "terrain", "layout_key", "actions"]:
        assert data[key] == original[key], "Preserved field changed: " + key
    assert sum(bool(cell) for cell in data["cells"]) == original["initial"]
    assert all(not value or data["roles"][i] in (1, 2, 3) for i, value in enumerate(data["cells"]))
    assert all(data["cells"][int(p["y"]) * width + int(p["x"])] for p in data["preview"])
    if "clearance" in spec:
        x0, x1, top, bottom = spec["clearance"]
        leg_cells = {cell for rect in spec["legs"] for cell in rect_ids(rect, width)}
        assert all(not data["cells"][y * width + x] or y * width + x in leg_cells
                   for y in range(top, bottom) for x in range(x0, x1))
    result = inspect_geometry(data)
    assert result["buried_cells"] == result["cliff_side_contacts"] == result["ungrounded_cells"] == 0
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    report = {"scope": "Static map data only; no game, test, scene, browser, device or simulation execution.", "maps": {}}
    untouched = {p.name: sha256(p.read_bytes()) for p in args.destination.glob("*.json")
                 if p.stem not in REPAIRS}
    outputs = []
    for map_id, spec in REPAIRS.items():
        raw = (args.source / (map_id + ".json")).read_bytes()
        assert sha256(raw) == spec["sha256"], "Original map hash differs: " + map_id
        original = json.loads(raw)
        updated = repair(original, spec)
        output = (json.dumps(updated, separators=(",", ":"), ensure_ascii=False) + "\n").encode()
        report["maps"][map_id] = {"before_sha256": sha256(raw), "after_sha256": sha256(output),
            "before": inspect_geometry(original), "after": inspect_geometry(updated),
            "moves": spec["moves"], "added_legs": spec["legs"], "removed_windows": spec["windows"],
            "fall_clearance_cells": 24 if spec["legs"] else None}
        outputs.append((args.destination / (map_id + ".json"), output))
    for filename, output in outputs:
        filename.parent.mkdir(parents=True, exist_ok=True)
        filename.write_bytes(output)
    audit = [inspect_geometry(json.loads(p.read_bytes())) for p in args.destination.glob("*.json")]
    assert all(sha256((args.destination / name).read_bytes()) == digest for name, digest in untouched.items())
    assert all(item["buried_cells"] == item["cliff_side_contacts"] == item["ungrounded_cells"] == 0 for item in audit)
    report["campaign_audit"] = {"maps": len(audit), "buried_cells": 0,
        "cliff_side_contacts": 0, "ungrounded_cells": 0, "untouched_map_count": len(untouched),
        "untouched_map_sha256": untouched}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
