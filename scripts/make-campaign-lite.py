#!/usr/bin/env python3
"""Statically author reduced-pixel maps; never run game or physics code."""
import argparse
from collections import defaultdict
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
CODEC = runpy.run_path(str(ROOT / "scripts/compact-map-data.py"))
GEOMETRY = runpy.run_path(str(ROOT / "scripts/repair-floor-standing-maps.py"))
SCALE = runpy.run_path(str(ROOT / "scripts/make-mosaic-boss-lite.py"))["scaled"]
BOSS = "mosaic-boss-mosaic-terrain-frame-v1"


def source_modules(data):
    result = [-1] * len(data["cells"])
    for index, module in enumerate(data["modules"]):
        for cell in module["pixels"]:
            assert data["cells"][cell] and result[cell] == -1
            result[cell] = index
    assert all((module >= 0) == bool(data["cells"][i]) for i, module in enumerate(result))
    return result


def edges(data, modules):
    width = data["width"]
    result = set()
    for a, occupied in enumerate(data["cells"]):
        if not occupied:
            continue
        for b in [a + width] + ([a + 1] if a % width < width - 1 else []):
            if b < len(modules) and modules[b] >= 0 and modules[a] != modules[b]:
                result.add(tuple(sorted((modules[a], modules[b]))))
    return result


def inspect(data):
    if "module_links" not in data:
        data = deepcopy(data)
        GEOMETRY["rebuild_topology"](data)
    return GEOMETRY["inspect_geometry"](data)


def resize(source):
    data = deepcopy(source)
    old_w, old_h = source["width"], source["height"]
    width, height = SCALE(old_w), SCALE(old_h)
    original_modules = source_modules(source)
    original_edges = edges(source, original_modules)
    provenance = [-1] * (width * height)
    data.update(width=width, height=height, floor_y=SCALE(source["floor_y"]))
    for field in ["cells", "roles", "colors"]:
        data[field] = [0] * (width * height)
    for y in range(height):
        old_y = min(old_h - 1, (y * 10 + 5) // 8)
        for x in range(width):
            old_x = min(old_w - 1, (x * 10 + 5) // 8)
            old_id, cell = old_y * old_w + old_x, y * width + x
            for field in ["cells", "roles", "colors"]:
                data[field][cell] = source[field][old_id]
            provenance[cell] = original_modules[old_id]
    added = 0
    pillar_offsets = []
    pillar_clearance = []
    for index, module in enumerate(source["modules"]):
        if module["type"] != "pillar":
            continue
        rows = defaultdict(list)
        for cell in module["pixels"]:
            rows[cell // old_w].append(cell % old_w)
        commands = []
        for y in range(height):
            old_y = min(old_h - 1, (y * 10 + 5) // 8)
            if old_y not in rows:
                continue
            xs = sorted(rows[old_y])
            spans = []
            for x in xs:
                if spans and x == spans[-1][1]:
                    spans[-1][1] += 1
                else:
                    spans.append([x, x + 1])
            for left, right in spans:
                x0 = SCALE(left)
                x1 = max(SCALE(right), x0 + min(2, right - left))
                assert 0 <= x0 < x1 <= width
                for x in range(x0, x1):
                    old_x = min(right - 1, max(left, (x * 10 + 5) // 8))
                    old_id = old_y * old_w + old_x
                    commands.append((x, y, old_id))
        # A retained two-cell support may need one-cell horizontal clearance.
        # Move the whole support together instead of adding a kink at its neck.
        def fits(x, y):
            if not 0 <= x < width:
                return False
            origin = provenance[y * width + x]
            # Retain narrow slots where a support passes through its own roof/body.
            return origin in [-1, index] or (source["modules"][origin]["type"] != "pillar" and
                    tuple(sorted((origin, index))) in original_edges)
        offsets = [dx for dx in [0, -1, 1] if all(fits(x + dx, y) for x, y, _ in commands)]
        assert offsets, f"pillar{index} needs reviewed clearance"
        dx = offsets[0]
        if dx:
            pillar_offsets.append({"module": index, "dx": dx})
        old_cells = {cell for cell, origin in enumerate(provenance) if origin == index}
        new_cells = {y * width + x + dx for x, y, _ in commands}
        added += len(new_cells - old_cells)
        for cell in old_cells:
            for field in ["cells", "roles", "colors"]:
                data[field][cell] = 0
            provenance[cell] = -1
        for x, y, old_id in commands:
            cell = y * width + x + dx
            if provenance[cell] >= 0 and provenance[cell] != index:
                pillar_clearance.append({"x": x + dx, "y": y, "pillar": index, "neighbor": provenance[cell]})
            for field in ["cells", "roles", "colors"]:
                data[field][cell] = source[field][old_id]
            provenance[cell] = index
    if source.get("terrain"):
        data["terrain"] = [{"x": SCALE(s["x"]), "w": SCALE(s["x"] + s["w"]) - SCALE(s["x"]),
                            "y": SCALE(s["y"])} for s in source["terrain"]]
        assert sum(s["w"] for s in data["terrain"]) == width
    data["preview"] = [{**p, "x": SCALE(p["x"]), "y": SCALE(p["y"] + 1) - 1}
                       for p in source.get("preview", [])]
    for action in data.get("actions", []):
        for field in ["x", "y", "to_x", "to_y"]:
            if field in action:
                action[field] = SCALE(action[field])
    GEOMETRY["rebuild_topology"](data)
    mapping = []
    for module in data["modules"]:
        origins = {provenance[cell] for cell in module["pixels"]}
        assert len(origins) == 1 and -1 not in origins, f"merged role modules: {origins}"
        mapping.append(origins.pop())
    assert sorted(mapping) == list(range(len(source["modules"]))), "role module split/disappeared"
    actual_edges = {tuple(sorted((mapping[a], mapping[b]))) for a, b in edges(data, data["module_of"])}
    assert actual_edges == original_edges, "module adjacency changed"
    data["initial"] = sum(bool(c) for c in data["cells"])
    after = GEOMETRY["inspect_geometry"](data)
    assert after["buried_cells"] == after["cliff_side_contacts"] == after["ungrounded_cells"] == 0, str(after)
    before_count = sum(bool(c) for c in source["cells"])
    assert 0 < data["initial"] < before_count
    if "module_of" not in source:
        data.pop("module_of")
    if "module_links" not in source:
        data.pop("module_links")
    if "initial" not in source:
        data.pop("initial")
    report = {"before": inspect(source), "after": after,
              "grid_before": [old_w, old_h], "grid_after": [width, height],
              "reduction_fraction": 1 - after["pixels"] / before_count,
              "pillar_pixels_restored": added, "pillar_offsets": pillar_offsets,
              "pillar_slot_clearance": pillar_clearance,
              "module_graph_preserved": True}
    return data, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--golden-boss", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    assert args.source.resolve() != args.destination.resolve(), "Preserve original data"
    files = sorted((args.source / "maps").glob("*.json")) + [args.source / "arch_lane.json"]
    assert len(files) == 44
    outputs, reports, failures = {}, [], []
    for path in files:
        rel = path.relative_to(args.source)
        raw = path.read_bytes()
        source = CODEC["unpack"](json.loads(raw))
        try:
            data, report = resize(source)
            encoded = CODEC["encode"](CODEC["pack"](data))
            assert CODEC["unpack"](json.loads(encoded)) == data
            if path.stem == BOSS:
                assert encoded == args.golden_boss.read_bytes(), "accepted boss changed"
            outputs[rel] = encoded
            reports.append({"file": str(rel), "source_sha256": hashlib.sha256(raw).hexdigest(),
                            "output_sha256": hashlib.sha256(encoded).hexdigest(), **report})
        except AssertionError as error:
            failures.append({"file": str(rel), "reason": str(error)})
    result = {"scope": "Static authored JSON only; no game/physics/scene execution.",
              "coordinate_scale": 0.8, "maps": reports, "failures": failures}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, indent=2) + "\n")
    assert not failures, json.dumps(failures, indent=2)
    campaign = json.loads((args.source / "campaign.json").read_text())
    for meta in campaign["sites"] + [campaign["tutorial_metadata"]]:
        data = CODEC["unpack"](json.loads(outputs[Path("maps") / (meta["id"] + ".json")]))
        meta["record_total_limit"] = max(meta.get("record_total_limit", 0), meta["initial"])
        for key in ["width", "height", "floor_y", "initial", "terrain"]:
            meta[key] = data.get(key)
    outputs[Path("campaign.json")] = CODEC["encode"](campaign)
    for rel, encoded in outputs.items():
        output = args.destination / rel
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(encoded)
    print(json.dumps({"maps": len(reports), "before_pixels": sum(r["before"]["pixels"] for r in reports),
                      "after_pixels": sum(r["after"]["pixels"] for r in reports), "failures": failures}, indent=2))


if __name__ == "__main__":
    main()
