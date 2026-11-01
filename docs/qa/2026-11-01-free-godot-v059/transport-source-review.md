# Free Godot 0.5.9 transport correction review

What this change does: Serves the packaged WASM/PCK gzip bytes as explicit payloads instead of declaring those bytes to be HTTP content coding. A narrowly scoped startup fetch adapter decompresses that payload after the browser performs normal HTTP decoding, then gives Godot the expected MIME types and bytes.

**Verdict: Approved for the transport source/integration delta. No blocking finding identified.** This does not establish public delivery or browser execution. Those remain separate gates.

## Review scope

Read `.superpowers/sdd/free-godot-v059/transport-fix-review.diff` once, the current generated game entry, current `_headers`, and the canonical entry's base. Inspected only the connected emitted loader's fetch/preloader code for a named risk: rebuilding a Response might lose metadata or progress assumptions that Godot requires. Did not repeat the original whole-change review.

Candidate inspected: `free-059-f0aa866ea27e`, shell `shell-B4F1XaDA.js`.

The coordinator supplied the public HTTP evidence that the previous custom Content-Encoding scheme left packaged gzip bytes after native HTTP decoding. This review accepts that observed defect as the reason for the correction; it did not make new network requests or execute a decoding adapter.

## Contract assessment

- **Exact URLs:** Generated `public/games/planet-patchup-free/index.html:210` constructs precisely two absolute URLs from the current content stem and `document.baseURI`. The canonical entry has `<base href="/games/planet-patchup-free/">`, so both Godot's relative fetch and the adapter's lookup resolve to the same current WASM/PCK resources. A Request uses its absolute `.url`; string/URL inputs are normalized against the same base. No suffix or origin-wide match expands interception to analytics, feedback, worklets, old assets, or other versions.
- **Single native capture:** `:209` binds the existing fetch once outside the replacement. The replacement calls that captured function with the original resource and options (`:215`), so it does not recurse and retains the caller's request options. Nonmatching URLs and non-OK responses are returned unchanged (`:216`). The current engine fetches the selected assets as ordinary GETs without custom query parameters.
- **Two-layer decoding:** Native fetch first returns the host's normal HTTP-decoded response. Only a successful exact-target response is piped through `DecompressionStream("gzip")` (`:218`), removing the separately packaged gzip payload. No manual decompression is applied to unrelated responses. The adapter leaves the stream lazy, allowing the existing loader to consume bytes without adding a second eager full-size buffer.
- **Response metadata:** The adapter copies headers, removes Content-Encoding and Content-Length, and assigns `application/wasm` or `application/octet-stream` (`:217`). It retains status/statusText. The emitted loader uses the requested file key and configured decoded `fileSizes` for progress; it does not require the reconstructed Response's URL, redirect flag, or original length. Its WASM path receives the correct MIME and stream, and its pack path reads an arrayBuffer.
- **Startup ordering:** The capability check and adapter installation occur in the existing readiness `.then` before calling the captured engine start (`:211-220`). Missing DecompressionStream throws into that returned Promise, which is connected to `displayFailureNotice` (`:232-234`), rather than throwing before the error handler is installed. The Web Lock/readiness ordering and dedicated `persistentPaths` remain unchanged. The previous engine-script error guard is retained.
- **Hosting declarations:** `public/_headers` contains only the current WASM/PCK exact paths, each with `Content-Type: application/gzip` and immutable/no-transform caching. It no longer declares a custom Content-Encoding. Host-added HTTP coding can therefore be decoded normally without being confused with the gzip payload. Manifest `encoding` now calls this `gzip-payload`, making the two hash domains explicit.
- **Scope:** The delta changes builder delivery, generated startup, header rules and documentation. It does not change map/data allowlists, economy, save migration, profile writes, bridge lifecycle, or the original Phaser source/archive. The coordinator reports retiring only the nonfunctional prior Godot candidate files; this focused review did not re-inventory the preserved archive.

## Findings

Critical: none.

Important: none.

Minor: none in this delta.

## Remaining release evidence

The coordinator reports Godot import/check-only/export and Vite bundle exited 0 for this candidate. Inline syntax checks, final Next build/output parity, and republished public HTTP proof were still coordinator work at review time and are not claimed complete here.

For public delivery, verify that standard HTTP-decoded bytes match the packaged gzip-payload hash, then locally gunzip those bytes and compare with the decoded engine/pack hash. The WASM/PCK magic after payload decoding must match the intended formats. This replaces the previous transport verification expectation; the previous public response did not satisfy it.

No tests, adapter execution, engine execution, scenes, gameplay, simulations, browser/device launches, telemetry probes, source edits, staging or commits were performed. Only this report was written. No browser-runtime, save-durability, audio, rendering or gameplay claim follows from approval.
