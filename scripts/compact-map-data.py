#!/usr/bin/env python3
"""Pack/unpack authored JSON without running Godot, scenes or simulations.

Use separate --source/--destination directories. Dense originals are required
to have only default values in empty cells; every output is roundtripped and
compared to the complete input dictionary before any file is written.
"""
import argparse
from copy import deepcopy
import gzip
import hashlib
import json
from pathlib import Path

FIELDS = ("cells", "roles", "colors", "module_of")
ENCODING = "occupied-runs-v1"


def encode(data):
    return (json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n").encode()


def unpack(source):
    data = deepcopy(source)
    if data.get("schema_version") == 1:
        return data
    assert data.get("schema_version") == 2 and data.get("encoding") == ENCODING
    assert all(k not in data for k in FIELDS)
    size = data["width"] * data["height"]
    runs = data.pop("pixel_runs")
    assert len(runs) % 6 == 0
    for field in FIELDS:
        data[field] = [-1 if field == "module_of" else 0] * size
    previous_end = count = 0
    for offset in range(0, len(runs), 6):
        start, length, cell, role, color, module = runs[offset:offset + 6]
        assert all(type(v) is int for v in runs[offset:offset + 6])
        assert previous_end <= start < start + length <= size
        assert 1 <= cell <= 255 and 1 <= role <= 3 and 0 <= color <= 0xffffff
        assert module == -1 if data.get("omit_module_of") else 0 <= module < len(data["modules"])
        for field, value in zip(FIELDS, (cell, role, color, module)):
            data[field][start:start + length] = [value] * length
        previous_end = start + length
        count += length
    assert count == data["initial"]
    data.pop("encoding")
    if data.pop("omit_initial", False):
        data.pop("initial")
    if data.pop("omit_module_of", False):
        data.pop("module_of")
    data["schema_version"] = 1
    return data


def pack(source):
    data = unpack(source)
    size = data["width"] * data["height"]
    assert all(type(data[k]) is list and len(data[k]) == size for k in FIELDS if k in data)
    assert all(k in data for k in FIELDS[:3])
    runs, previous, end = [], None, -1
    count = 0
    for cell_id, cell in enumerate(data["cells"]):
        if not cell:
            assert all(data[k][cell_id] == (-1 if k == "module_of" else 0) for k in FIELDS if k in data)
            continue
        values = tuple(data[k][cell_id] if k in data else -1 for k in FIELDS)
        if cell_id == end and values == previous:
            runs[-5] += 1
        else:
            runs.extend((cell_id, 1, *values))
        previous, end = values, cell_id + 1
        count += 1
    assert count == data.get("initial", count)
    output = {k: v for k, v in data.items() if k not in FIELDS}
    output.update(schema_version=2, encoding=ENCODING, pixel_runs=runs)
    output["initial"] = count
    if "initial" not in data:
        output["omit_initial"] = True
    if "module_of" not in data:
        output["omit_module_of"] = True
    assert unpack(output) == data, "Sparse encoding changed authored data"
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--mode", choices=["pack", "unpack"], default="pack")
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    inputs = sorted((args.source / "maps").glob("*.json"))
    if (args.source / "arch_lane.json").exists():
        inputs.append(args.source / "arch_lane.json")
    assert inputs, "No authored maps found"
    outputs, records = [], []
    for path in inputs:
        raw = path.read_bytes()
        original = json.loads(raw)
        logical = unpack(original)
        updated = pack(logical) if args.mode == "pack" else logical
        output = encode(updated)
        assert unpack(json.loads(output)) == logical
        count = sum(bool(c) for c in logical["cells"])
        assert updated.get("initial", count) == count
        rel = path.relative_to(args.source)
        outputs.append((args.destination / rel, output))
        logical_hash = hashlib.sha256(json.dumps(logical, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        records.append({"file": str(rel), "id": logical.get("id", logical.get("map_id")), "pixels": count,
            "grid_cells": logical["width"] * logical["height"], "before_bytes": len(raw),
            "after_bytes": len(output), "before_gzip_bytes": len(gzip.compress(raw, mtime=0)),
            "after_gzip_bytes": len(gzip.compress(output, mtime=0)),
            "before_sha256": hashlib.sha256(raw).hexdigest(), "after_sha256": hashlib.sha256(output).hexdigest(),
            "logical_sha256": logical_hash, "exact_full_dictionary_roundtrip": True,
            "runs": len(updated.get("pixel_runs", [])) // 6})
    for destination, output in outputs:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(output)
    report = {"scope": "Static JSON serialization assertions only; no tests, game runtime, scene, simulation or device launch.",
              "encoding": ENCODING, "mode": args.mode, "files": records,
              "total_before_bytes": sum(r["before_bytes"] for r in records),
              "total_after_bytes": sum(r["after_bytes"] for r in records)}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "files"}, indent=2))


if __name__ == "__main__":
    main()
