# Mosaic Boss Reduced-Pixel Comparison

User approved reducing the final boss's actual simulated pixels by30–40% before deciding whether to change other maps. Work stays on the isolated candidate branch; no public web publication or other campaign map replacement is authorized in this comparison.

## Design

Resize the640×512 authored grid to512×410 using deterministic nearest-center sampling at0.8 coordinates. Scale terrain boundaries and preview targets using the same coordinate transform. Preserve all24 role modules (12 pillars, six bodies, six roofs), their two connected assemblies and relative layout, and retain at least two cells across the originally two-cell pillars. Rebuild connected role modules and adjacent module links with the existing static map-authoring helper. Ground contacts must remain grounded; no cells may be buried or attached to cliff sides. Occupied pixels must be between60% and70% of47,156. Keep the original map ID and preserve historical record limits in campaign metadata.

The camera already fits the map to the play area, making each remaining logical cell larger. This is a lower-resolution authored comparison, not an identical simulation. Physics/skill/price/profile/collection source remains unchanged. Less geometric mass and coarser joints can change destruction; those results belong to the user's playtest. Per-pixel rewards and the existing boss clear bonuses remain unchanged, so the maximum raw pixel payout is lower in this candidate. No new reward multiplier or save migration is introduced for an unadopted experiment.

## Plan

- [x] Preserve the0.5.50(60) native candidate, original boss/campaign files and their hashes. Record the original grid/pixel/assembly/module/ground-contact counts with static file inspection.
- [x] Add a narrowly scoped deterministic authoring script for this boss. Sample occupied data, retain thin pillar widths, scale terrain/preview, rebuild modules, and encode occupied-runs-v1. Assert the30–40% pixel reduction, all original role assemblies, valid links, zero burial/cliff-side contact/ungrounded cells, and unchanged42 other maps/fallback.
- [x] Export a static before/after map image and a machine-readable data report. This is authored geometry inspection, not physics or gameplay testing.
- [x] Copy the adopted native project to a new0.5.51(61) QA candidate, applying only the boss/campaign data and build identifiers. Preserve the bundle and save directory. Import/compile/export iOS and the local web package, sign and update-install iPhone without launch. Keep the public web at0.5.50 data.
- [x] Record source/map/artifact hashes, compile/build/sign/install evidence, source routing and rollback to0.5.50. The user compares first entry and large simultaneous collapses with the same loadout; no FPS/loading result is claimed by the agent.

## Boundaries

No game tests, scenes, simulations, browser driving or device app launches. Static JSON transforms/assertions, static image rendering, compilation/export, signing and installation are allowed. No public deployment until the reduced map is accepted. Do not copy this experimental map over the dirty primary checkout or reduce all other maps.
