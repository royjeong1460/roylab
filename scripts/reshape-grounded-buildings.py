#!/usr/bin/env python3
"""Author reviewed floor openings in JSON; never load a game runtime.

Replay against the exact baseline map snapshot. The plan is deliberately
explicit: a future export must not silently reshape every new authored map.
"""
import argparse
from collections import deque
from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
helper = importlib.util.spec_from_file_location("floor", ROOT / "scripts/repair-floor-standing-maps.py")
floor = importlib.util.module_from_spec(helper)
helper.loader.exec_module(floor)


def encode(data):
    return (json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n").encode()


def groups(data):
    width = data["width"]
    unseen = {i for i, value in enumerate(data["cells"]) if value}
    result = []
    while unseen:
        group = [min(unseen)]
        unseen.remove(group[0])
        for cell in group:
            x = cell % width
            neighbors = ([cell - 1] if x else []) + ([cell + 1] if x < width - 1 else [])
            for neighbor in neighbors + [cell - width, cell + width]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    group.append(neighbor)
        result.append(set(group))
    return result


def surface(data):
    result = [data["floor_y"]] * data["width"]
    for span in data.get("terrain") or []:
        result[span["x"]:span["x"] + span["w"]] = [span["y"]] * span["w"]
    return result


def intact(data, original_groups):
    # Every original assembly stays connected and still reaches a floor.
    width, cells, heights = data["width"], data["cells"], surface(data)
    for original in original_groups:
        remaining = {i for i in original if cells[i]}
        if not remaining:
            return False
        seed = next(iter(remaining))
        reached, queue = {seed}, deque([seed])
        grounded = False
        while queue:
            cell = queue.popleft()
            x = cell % width
            grounded |= cell // width + 1 == heights[x]
            neighbors = ([cell - 1] if x else []) + ([cell + 1] if x < width - 1 else [])
            for neighbor in neighbors + [cell - width, cell + width]:
                if neighbor in remaining and neighbor not in reached:
                    reached.add(neighbor)
                    queue.append(neighbor)
        if not grounded or len(reached) != len(remaining):
            return False
    return True


def move(data, pixels, dx, dy):
    width = data["width"]
    changes = {p: p + dx + dy * width for p in pixels}
    original = {field: data[field][:] for field in ["cells", "roles", "colors"]}
    for field in original:
        for cell in changes:
            data[field][cell] = 0
    for cell, target in changes.items():
        assert 0 <= target < len(data["cells"]) and not data["cells"][target], "Move overlaps another structure"
        for field in original:
            data[field][target] = original[field][cell]
    return changes


def carve(data, edit, original_groups):
    width = data["width"]
    start, ground, span = edit["contact"]
    leg = edit["leg_width"]
    body = set(data["modules"][edit["module"]]["pixels"])
    left, right = start + leg, start + span - leg
    assert right - left >= 8
    for depth in range(edit["preferred_depth"], 3, -1):
        removed = [y * width + x for y in range(ground - depth, ground)
                   for x in range(left, right) if y * width + x in body]
        saved = {p: data["cells"][p] for p in removed}
        for cell in removed:
            data["cells"][cell] = 0
        # Where a lower sill is the only bridge, keep six cells above the gap.
        beam = all(data["cells"][y * width + x] for y in range(ground - depth - 6, ground - depth)
                   for x in range(left, right))
        acceptable = intact(data, original_groups)
        # Removing a closed arch's lower sill may expose its existing upper arch.
        opens_existing_arch = acceptable and any(not data["cells"][(ground - depth - 1) * width + x]
                                                 for x in range(left, right))
        if acceptable and (beam or opens_existing_arch):
            for cell in removed:
                data["roles"][cell] = data["colors"][cell] = 0
            posts = []
            for x0 in [start, right]:
                for y in range(ground - depth, ground):
                    for x in range(x0, x0 + leg):
                        cell = y * width + x
                        if cell in body and data["cells"][cell]:
                            data["roles"][cell] = 1
                            posts.append(cell)
            assert posts and removed
            return {**edit, "depth": depth, "removed": len(removed), "pillar_cells": len(posts),
                    "void": [left, ground - depth, right - left, depth], "method": "underside-opening"}
        for cell, value in saved.items():
            data["cells"][cell] = value
    # A six-cell sill cannot be hollowed safely; lift this small courtyard as a
    # whole and extend its two broad feet, retaining the connecting sill.
    assert data["id"] == "amber-06-amber-terrain-frame-v1", "Needs an explicit authored exception"
    assembly = next(g for g in original_groups if body.intersection(g))
    assert len([p for p in assembly if p // width + 1 == surface(data)[p % width]]) == span
    changes = move(data, assembly, 0, -12)
    color = data["colors"][next(p for p in changes.values() if data["roles"][p] == 2)]
    added = []
    for x0 in [start, right]:
        for y in range(ground - 12, ground):
            for x in range(x0, x0 + leg):
                cell = y * width + x
                assert not data["cells"][cell]
                data["cells"][cell], data["roles"][cell], data["colors"][cell] = 1, 1, color
                added.append(cell)
    return {**edit, "depth": 12, "removed": -len(added), "pillar_cells": len(added),
            "void": [left, ground - 12, right - left, 12], "method": "raised-six-cell-sill",
            "moved_cells": len(changes)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--campaign", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--plan", type=Path, default=ROOT / "docs/qa/2026-11-07-ground-openings/authoring-plan.json")
    args = parser.parse_args()
    plan = json.loads(args.plan.read_bytes())
    campaign = json.loads(args.campaign.read_bytes())
    metadata = {s["id"]: s for s in campaign["sites"]}
    report = {"scope": "Static JSON authoring only; no tests, scenes, runtime, simulation or device launch.",
              "baseline_commit": plan["baseline_commit"], "maps": {}}
    outputs = {}
    for spec in plan["maps"]:
        name = spec["id"] + ".json"
        raw = (args.source / name).read_bytes()
        assert floor.sha256(raw) == spec["input_sha256"], "Input differs: " + name
        before = json.loads(raw)
        if "reference_commit" in spec:
            raw = subprocess.check_output(["git", "show", spec["reference_commit"] + ":demos/planet-patchup/godot-free/data/maps/" + name], cwd=ROOT)
        data = json.loads(raw)
        for change in spec.get("pre_moves", []):
            move(data, [p for m in change["modules"] for p in data["modules"][m]["pixels"]], change["dx"], change["dy"])
        floor.rebuild_topology(data)
        original_groups = groups(data)
        edits = [carve(data, edit, original_groups) for edit in spec["openings"]]
        floor.rebuild_topology(data)
        data["initial"] = sum(bool(c) for c in data["cells"])
        assert data["initial"] == before["initial"] - sum(e["removed"] for e in edits)
        for key in ["id", "map_id", "width", "height", "floor_y", "region", "boss", "layout_key", "terrain", "actions"]:
            assert data[key] == before[key], "Preserved field differs: " + key
        # Preview hints point to the new feet rather than pixels removed below.
        data["preview"] = [{"x": e["contact"][0], "y": e["contact"][1] - 1} for e in edits][:8]
        assert all(data["cells"][p["y"] * data["width"] + p["x"]] for p in data["preview"])
        result = floor.inspect_geometry(data)
        assert result["buried_cells"] == result["cliff_side_contacts"] == result["ungrounded_cells"] == 0
        assert len(groups(data)) == len(original_groups), "Authored assembly was split before play"
        meta = metadata[data["id"]]
        meta["record_total_limit"] = max(int(meta.get("record_total_limit", 0)), before["initial"], data["initial"])
        meta["initial"] = data["initial"]
        output = encode(data)
        outputs[name] = output
        report["maps"][data["id"]] = {"before_sha256": spec["input_sha256"], "after_sha256": floor.sha256(output),
                "before": floor.inspect_geometry(before), "after": result, "openings": edits,
                "historical_record_total_limit": meta["record_total_limit"]}
    # Validate the entire catalog before writing a single product file.
    audit = []
    for source in sorted(args.source.glob("*.json")):
        raw = outputs.get(source.name, source.read_bytes())
        data = json.loads(raw)
        result = floor.inspect_geometry(data)
        assert result["buried_cells"] == result["cliff_side_contacts"] == result["ungrounded_cells"] == 0
        assert result["pixels"] == data["initial"]
        audit.append({"id": data["id"], "changed": source.name in outputs, **result,
                      "sha256": floor.sha256(raw)})
    assert len(audit) == 43
    args.destination.mkdir(parents=True, exist_ok=True)
    for name, output in outputs.items():
        (args.destination / name).write_bytes(output)
    args.campaign.write_bytes(encode(campaign))
    report["campaign_audit"] = audit
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"maps_reviewed": len(audit), "maps_changed": len(outputs),
                      "openings": sum(len(i["openings"]) for i in report["maps"].values()),
                      "buried": 0, "cliff_contacts": 0, "ungrounded": 0}))


if __name__ == "__main__":
    main()
