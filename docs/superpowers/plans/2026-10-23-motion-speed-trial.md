# Independent fall / rotation tuning trial

User wants to test which number makes slow-looking falls and tipping faster.
Create `/games/planet-patchup-motion/` without modifying any published edition.

Three controls, relative to the current support world:
- Gravity 0.5–3: multiply rigid-body gravity and airborne-pixel gravity together.
- Rotation response 0.5–4: divide inertia coefficient by the multiplier. This is
  not a promise of proportional angular velocity. Mass, support model and gravity
  remain unchanged when only this control changes.
- Speed limit 1–2: multiply body maximum point travel and airborne-pixel speed cap.
  Rotation counts toward maximum point travel; UI also displays cumulative limit
  calls. Raising limits can increase thin-collider tunnelling risk.

Default all 1. One-variable presets: gravity 1.5, rotation 2, speed limit 1.5,
plus baseline reset. Apply saves and reloads same map; cancel leaves it alone.
Settings are private to the motion trial. Attack settings initially snapshot
support, or ideas if absent, without writing either predecessor's keys.

Verification: motion 7 tests and support 8 tests pass. Build succeeds. Same
normal blast in tall map releases at 4.03s baseline, 3.43s gravity 1.5, 3.40s
rotation 2. Free-fall translation is identical under rotation-only change.
Combined maxima remain finite and conserve pixels, but can produce a different
contact/support configuration (still hinged at 8s); no universal faster-collapse
claim. Code review found no actionable issue. Desktop apply/reload, mobile-size
390x844 modal layout checked. Real iPhone touch feel/performance not checked.
