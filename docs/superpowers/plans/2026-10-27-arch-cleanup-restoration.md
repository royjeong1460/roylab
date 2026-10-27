# Arch cleanup and restoration

User direction: normal map clears gradually restore a region; the boss completes restoration. Reuse existing art while the broader design remains under consideration. Start at whole-map view. End an exhausted run as soon as collectible pixels are drained and make the cleanup countdown prominent.

Implementation:
- Six distinct normal map records at >=70% give one seventh restoration each. Boss clear gives full restoration. Tutorial, repeated clears and purchase locks do not affect restoration. Blend existing clean/dirty terrain and landmark textures, derive from existing saves.
- Arch camera starts fitted to the entire map, with manual zoom/pan unchanged.
- Preserve 10-second cleanup maximum and 0.5-second quiet-pixel confirmation. Ignore rigid-body motion when deciding whether collection is complete, but wait for bombs, wells, active devices and scheduled passive effects. Stop simulation at settlement; only pixels already generated are rewarded, never remaining chunks.
- One brief central BATTERY EMPTY announcement; noninteractive top-center COLLECT countdown and progress strip. Last three seconds gently pulse; reduced-motion disables animation; pause freezes timing.
- After early drain or full-map collection, show All pixels collected for one second before settlement. Physics and attacks remain stopped during this presentation hold; timeout settlement has no additional hold.
- Preserve physics, attack strength, progression costs, collection rate and old comparison variants.

Verification: run Arch/free regression tests, inspect actual renderer progression and mobile-size countdown, whole-map startup and settlement. Build the free demo, sync canonical routes and verify deployment. No physical iPhone QA claimed.
