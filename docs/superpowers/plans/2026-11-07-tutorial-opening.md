# Tutorial opening implementation plan

The approved opening lasts five foreground seconds and uses existing planet, sky and Arch scenery assets. It plays whenever the resolved run is the tutorial, including training and tutorial retries. A Skip button and platform Back action both enter the same tutorial immediately.

1. Add a presentation control with planet rotation, a crossfade into the first region, two localized captions and a short final fade. Reuse the current sphere shader and background renderer.
2. Route a successful tutorial request through the opening before creating the play world. Create normal and boss worlds directly. Attach the world and start the run journal only after completion or Skip. Ignore repeated completion and exclude inactive time.
3. Share the presentation and routing with the current iOS candidate. Keep existing platform save paths and native ad handling.
4. Compile and export both targets, verify the package scope and build/sign the iPhone app. Keep the opening in the local web for visual review. Record build and installation separately from user playback.
