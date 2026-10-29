# Free web feedback and analytics

2026-10-29. Scope: the canonical free Arch campaign at `/planet-patchup/play/`.

## Current connection status

US project `694008` is configured with its public project token. The API survey is active and the dashboard has been created. A marked `pp_connection_verified` event was accepted by the real capture endpoint and observed in PostHog Activity. The client accepts its verified `status: "Ok"` success envelope as well as legacy `status: 1`. The connector's exec endpoint currently returns `Unknown tool`, so provider setup was completed through the user's authenticated PostHog browser.

- [Gameplay dashboard](https://us.posthog.com/project/694008/dashboard/2274571)
- [Feedback survey results](https://us.posthog.com/project/694008/surveys/01a1857e-4acf-0000-e385-4127f6a6a6ba)
- [Received events](https://us.posthog.com/project/694008/activity/events)

The release is prepared from public `origin/main` commit `037c080` in the existing isolated release checkout, carrying only analytics/UI hooks and their generated assets. Unrelated working-copy physics and planet experiments are excluded. Public deployment and browser-origin feedback verification must be observed separately from the server-side connection test. Integration checks use `source=integration-smoke`; they are not player feedback or measured audience results.

## Connect the project

Use the existing PostHog project, or create one in the user's account. The PostHog plugin can configure the survey/dashboard after its account connection is confirmed. The browser build needs only the **public project token**, not a personal API key or a project secret key.

Set these variables in `demos/planet-patchup/.env.production.local` (this file is ignored):

```dotenv
VITE_POSTHOG_PROJECT_TOKEN=phc_your_public_project_token
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_SURVEY_ID=your_survey_uuid
```

Use `https://eu.i.posthog.com` for an EU project. Unsupported hosts and tokens are disabled. The survey ID is optional: without one, deliberate responses arrive as `pp_feedback_submitted` events; with one, they arrive as native `survey sent` responses.

Create an API survey named **Planet Patchup · Free web feedback**, with exactly this question order:

1. Rating 1–5: `How fun was it?`
2. Single choice: `What could be better?` Choices: `none`, `controls`, `tutorial`, `repetition`, `difficulty`, `performance`, `bug`.
3. Optional open text: `Anything else?`

The custom game form presents descriptive labels for these choice values. The capture payload uses PostHog's supported positional response properties, so do not reorder this survey's questions. Use a new survey ID if the question order changes. No account or email is required from the player.

Rebuild using the existing edition-aware release command from the repository root:

```sh
node scripts/build-planet-demo.mjs --free
```

This builds the game with the local Vite variables, preserves older hashed free chunks, copies the release to `public/games/planet-patchup-free/`, and regenerates canonical route HTML. A normal Next.js site build alone does not rebuild the game or inject the Vite variables. Review existing local art/game changes before publishing the resulting release.

Confirm an event in the intended project before considering the connection complete. QA/local visits are intentionally excluded, even when tokens are configured. Use a separate preview deployment and a dedicated PostHog test project to verify a full live flow without contaminating production data. Then deploy the reviewed free release through the existing Cloudflare workflow.

## Feedback and collection controls

Once configured, Feedback appears on the planet home, pause menu, run receipt and workshop. The form requires a 1–5 rating; category defaults to no particular issue and text is optional with a 1,000-character limit. Pending submissions disable inputs. Failed submissions keep the draft; retries keep the same event UUID, timestamp, respondent ID and response ID. A successful HTTP response with `status: "Ok"` (the verified current capture response) or legacy `status: 1` is required before the success notice appears.

Options contains **Share play statistics · ON/OFF**. The choice persists independently of game progress. Switching statistics off prevents automatic events; deliberate feedback remains available with a page-local ID. No DOM autocapture, recordings, accounts, full URL/query strings, full referrers, raw saves, or detailed physics journals are uploaded. Requests ask PostHog not to enrich IP/location or process person profiles. PostHog still handles incoming network requests under the project's service settings.

## Events and metrics

| Event | Meaning |
| --- | --- |
| `pp_page_loaded` | Free entry analytics module loaded; does not prove game readiness |
| `pp_game_ready` | Game controller and menus initialized; `load_ms` uses real navigation-relative time |
| `pp_screen_view` | Home, workshop, expedition, map selection or another named menu became visible |
| `pp_run_started` | A particular map attempt started; tutorial remains separate |
| `pp_first_attack` | First recorded tool use of this attempt |
| `pp_recovery_70` | Attempt first qualified, including a final collection sweep |
| `pp_run_finished` | Successful settlement, with actual recovery, reward and qualification |
| `pp_upgrade_bought` | Confirmed in-game parts purchase, not a money transaction |
| `pp_boss_completed` | Qualified boss settlement; `first_clear` distinguishes repeats |
| `pp_run_abandoned` | Explicit controller abandonment, e.g. progress reset |
| `pp_activity` | Non-overlapping active/menu deltas, cumulative page totals, last map/progress and flush reason |
| `pp_page_left` / `pp_page_cached` | Best-effort page lifecycle checkpoint; not a confirmed reason for leaving |
| `pp_feedback_opened` | Player opened feedback from a named entry point |
| `pp_feedback_submitted` / `survey sent` | Deliberate feedback; one response ID across retries |

Common properties include `edition=free`, campaign, map/balance/build versions, coarse device type, source, page session and named screen. `source` uses a short safe `utm_source` value or referrer hostname only. The public-project request token grants ingestion, not dashboard access. A separate random browser ID supports return-visit analysis and survives game-progress resets. It is an estimate of browsers, not verified unique people; different devices, browsers, storage clearing and blockers affect counts.

`active_ms` measures foreground, unpaused gameplay using a monotonic real clock. `menu_ms` covers foreground non-playing time, including paused/settling screens. Hidden/unfocused time is excluded. Gameplay is checkpointed before the completion notice and before asynchronous settlement, so those waits do not inflate active time. The existing local journal continues to measure/report its original fields separately.

Activity is flushed every 15 seconds and at run/screen/visibility/exit transitions. Sum the deltas per `page_session_id` before calculating a per-session median. Do not average individual heartbeat rows. Cumulative session totals can be used to check the sum; do not sum cumulative totals. Page sessions begin at navigation/reload rather than reproducing PostHog SDK's 30-minute inactivity sessions.

Delivery is best effort. Blockers, lost connections and mobile process termination can omit events and final checkpoints. A last received screen/progress identifies the last observed point, not why a player left. Long menu time may include foreground idling. Cross-tab totals are separate page sessions. Feedback retry identifiers support ingestion/dashboards deduplication; ordinary analytics are not a transaction ledger.

## Dashboard to create after connection

Name: **Planet Patchup · Free web play**. Scope to `edition=free`; compare build/balance versions, device type and source.

1. Daily distinct browsers with `pp_game_ready` and game-load-to-ready conversion.
2. Per-page median active seconds and menu seconds, calculated from `pp_activity` deltas.
3. First run → first attack → first settlement → another run, constrained to the same page session. Tutorial, ordinary maps and bosses are separate cohorts; upgrades are optional rather than a mandatory path to the boss.
4. Upgrade purchases by `upgrade_id`, and time to first upgrade.
5. Map recovery/70% rates and boss first-clear count, separating started/settled attempts.
6. Next-day retention using another `pp_game_ready` for the browser ID.
7. Last observed named screens/map progress and recent feedback. Deduplicate non-survey feedback by `submission_id`.

Do not present historical counts before this connection as collected data. The dashboard exists at the link above. Its measured audience results begin with actual connected free-web visits; integration checks are excluded. Survey results remain directly accessible through the linked survey page.

## Verification

New behavior tests: `node --test tests/arch-analytics.mjs` from the game directory. They cover missing/invalid configuration, test-visit exclusion, hidden/paused time, checkpoints before completion/settlement, run milestones, opt-out, response validation, transport rejection and retry identity.

Local form fixture: `tests/fixtures/analytics-feedback.html` on the Vite free dev server. It uses a delayed in-memory transport, never a real PostHog project or game progress. Verified success, failure with draft retention, retry success, disabled in-flight inputs, narrow layout without horizontal overflow and empty warning/error logs. Screenshot: `docs/qa/2026-10-28-feedback/feedback-local-qa.jpg`. This is desktop-browser QA, not physical phone validation.

The free flag is defined only in `vite.free.config.js`; paid builds remove the branch and contain no free analytics/feedback code. Verify the current paid build as well as Arch/free regressions after shared-controller changes.

Primary references: [capture API](https://posthog.com/docs/api/capture), [custom surveys](https://posthog.com/docs/surveys/implementing-custom-surveys), [event deduplication](https://posthog.com/docs/data/events).
