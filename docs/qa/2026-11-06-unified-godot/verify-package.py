"""Inspect the exported files and their native signature without running the game."""
from pathlib import Path
import gzip
import hashlib
import json
import plistlib
import re
import struct
import subprocess

qa = Path(__file__).resolve().parent
root = qa.parents[2]
native = root.parent / 'godot-paid-port'
ios_source = native / 'qa/unified-2026-11-06/project'
app = native / 'native/build/unified-2026-11-06-derived/Build/Products/Release-iphoneos/PPGodotCompare.app'
public = root / 'public/games/planet-patchup-free'
manifest = json.loads((root / 'demos/planet-patchup/dist-godot-free/build-manifest.json').read_text())
web = Path(manifest['scratch']) / 'project'
sha = lambda data: hashlib.sha256(data).hexdigest()


def entries(data):
    assert data[:4] == b'GDPC' and struct.unpack_from('<I', data, 4)[0] == 3
    base, offset = struct.unpack_from('<QQ', data, 24)
    count = struct.unpack_from('<I', data, offset)[0]
    offset += 4
    files = {}
    for _ in range(count):
        length = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        name = data[offset:offset + length].rstrip(b'\0').decode()
        offset += length
        start, size = struct.unpack_from('<QQ', data, offset)
        digest = data[offset + 16:offset + 32]
        flags = struct.unpack_from('<I', data, offset + 32)[0]
        offset += 36
        body = data[base + start:base + start + size]
        assert flags == 0 and name not in files and len(body) == size, name
        assert hashlib.md5(body).digest() == digest, name
        files[name] = body
    return files


assert manifest['version'] == '0.5.41'
for artifact in manifest['artifacts']:
    path = public / artifact['file']
    data = path.read_bytes()
    assert len(data) == artifact['bytes'] <= 25 * 1024**2
    assert sha(data) == artifact['sha256']
    decoded = gzip.decompress(data) if artifact['encoding'] == 'gzip-payload' else data
    assert sha(decoded) == artifact['decodedSha256'] and len(decoded) == artifact['decodedBytes']
    assert (root / 'out' / path.relative_to(root / 'public')).read_bytes() == data

web_pack = entries(gzip.decompress((public / (manifest['stem'] + '.pck')).read_bytes()))
ios_data = (app / 'PPGodotCompare.pck').read_bytes()
export = native / 'native/build/unified-2026-11-06'
assert ios_data == (export / 'PPGodotCompare.pck').read_bytes()
ios_pack = entries(ios_data)
maps = {f'data/maps/{name}.json' for name in manifest['allowedMaps']}
assert len(maps) == 43 and len(manifest['allowedSkills']) == 10
for pack in (web_pack, ios_pack):
    assert {path for path in pack if path.startswith('data/maps/') and path.endswith('.json')} == maps
for path in maps | {'data/campaign.json', 'data/balance.json', 'data/skill_expansion.json', 'data/collection_upgrades.json'}:
    assert web_pack[path] == ios_pack[path] == (web / path).read_bytes(), path

baseline = native / 'qa/perf-g40-2026-11-03/project'
for rel in ('world.gd', 'skill_physics.gd', 'chain_physics.gd', 'campaign/catalog.gd', 'campaign/progression.gd', 'campaign/economy.gd'):
    assert (web / rel).read_bytes() == (ios_source / rel).read_bytes() == (baseline / rel).read_bytes(), rel
assert (web / 'campaign/profile_schema.gd').read_bytes() == (ios_source / 'campaign/profile_schema.gd').read_bytes()
for project in (web, ios_source):
    screens = (project / 'app/screens.gd').read_text()
    assert 'markers.add_child(future)' in screens and 'future.mouse_filter = Control.MOUSE_FILTER_IGNORE' in screens
    assert '? · More regions may follow' in screens
    assert 'res://campaign/free_edition.gd' not in (project / 'campaign/progression.gd').read_text()

meta = plistlib.loads((app / 'Info.plist').read_bytes())
assert (meta['CFBundleIdentifier'], meta['CFBundleShortVersionString'], meta['CFBundleVersion'], meta['CFBundleDisplayName']) == ('com.roy.planetpatchup.godotcompare', '0.5.41', '50', 'Planet Patchup')
archive = 'native_core/bin/libpp_core.ios.template_release.arm64.a'
assert (ios_source / archive).read_bytes() == (export / 'PPGodotCompare' / archive).read_bytes() == (baseline / archive).read_bytes()
assert 'pp_core_init' in (export / 'PPGodotCompare/dummy.mm').read_text()
symbols = subprocess.check_output(['xcrun', 'nm', '-gU', str(app / 'PPGodotCompare')], text=True)
assert re.search(r'\bT _pp_core_init\b', symbols)
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
for rel in ('planet-patchup/play/index.html', 'planet-patchup/test/paid/index.html', 'planet-patchup/archive/paid-phaser/index.html', '_headers'):
    assert (root / 'public' / rel).read_bytes() == (root / 'out' / rel).read_bytes(), rel
assert '"/planet-patchup/test/paid/":"/planet-patchup/play/"' in (root / 'public/planet-patchup/routes.js').read_text()
report = {
    'version': '0.5.41', 'nativeBuild': 50, 'stem': manifest['stem'],
    'regions': 6, 'normalSites': 36, 'bossSites': 6, 'tutorials': 1, 'skills': 10,
    'matchingMapAndBalancePayloads': True, 'webPackEntries': len(web_pack),
    'nativePackEntries': len(ios_pack), 'nativePackSha256': sha(ios_data),
    'nativeSignatureVerified': True, 'nativeApp': str(app), 'nativeBundle': meta['CFBundleIdentifier'],
    'nativeCoreUnchanged': True, 'runtimeExecutedByAgent': False,
}
(qa / 'package-verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
