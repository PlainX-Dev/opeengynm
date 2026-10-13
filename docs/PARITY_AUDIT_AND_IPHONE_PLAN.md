# Web ↔ Android parity audit, and the iPhone live-workout plan

Status: **audit + plan only. No app code has been changed.**

## 0. How this was done (and what I couldn't verify)

- Downloaded the APK currently published at `opengym.duarte-santos.ch/openGym.apk` (redirects to
  `opengym.ch`). It reports **versionName 1.4.1**, ~300 MB.
- Unpacked it and compared its bundled web app against this repo's `frontend/` source. The most
  reliable signal is the UI translation table: both apps key every string by its English text, so a
  key-by-key diff is exact. The APK also carries a native layer (manifest, Capacitor plugins) I
  inspected directly.
- Built and tested this repo as a baseline: the Vercel/standalone build compiles; 169 unit tests pass.
  `coach.test.js` can't load only because `api/` dependencies aren't installed in this sandbox
  (`@anthropic-ai/claude-agent-sdk`) — not a code failure.

**Assumption to confirm:** I audited against the *published* v1.4.1 APK. If your installed APK is a
different version, the gap is smaller or different. Settings → About (or "Check for updates") in
your APK shows its version. "Checking fatigue" exists in v1.4.1, which is why I think it's the same
lineage.

**Not verified:** nothing in the iPhone section has been compiled or run — this sandbox is Linux; Swift
/ Xcode / a device are required (see §3.6).

---

## 1. The headline finding

**This is not "the web build is missing features the APK has". It's a version gap.**

| | Version | UI strings |
|---|---|---|
| This repo (`frontend/`, what Vercel builds) | v1.2.3 + Effort stats + AI Coach (fork) + `STANDALONE` flag | **781** |
| Published APK | **v1.4.1** | **2,258** |

- **1,587 UI strings exist in the APK and not in this repo** (≈100 of those are rewordings of strings
  the repo still has, so call it ~1,450 genuinely new). 110 repo strings no longer exist in the APK,
  mostly the same rewordings plus the fork's own Coach screens.
- The repo's `MOBILE`, `STANDALONE` and default builds share one codebase and have almost no
  feature gating between them (`mobile.js`, `standalone.js`, `demo.js` only switch storage,
  sign-in, notifications and media base). So the Vercel build and a build of *this* repo's Android
  project are feature-identical. The extra features in your APK simply aren't in this source tree.
- Upstream moved from 1.2.3 → 1.4.1 (and more) without this repo following.

Languages: APK ships 19 (adds **ar, bn, hu, th, uk, zh-TW, pt-BR**); repo has 12.

---

## 2. Feature gap (APK 1.4.1 vs this repo)

Priority: **P1** = changes how you train, **P2** = significant, **P3** = nice-to-have /
needs a backend / Android-only.

### Training & logging
| Feature in APK | P |
|---|---|
| Warm-up sets (add per exercise, auto ramp-up, excluded from volume/PRs/progression) | P1 |
| Drop-sets & rest-pause intensifiers; "+ Drop / + Burst" per set | P1 |
| Pyramid sets with per-set rep targets and **Max** sets | P1 |
| Left/Right (per-side) sets, "Switch sides", side-plank style holds | P1 |
| Back-off sets; triple-progression rule; deload routine; top-of-range ceiling | P1 |
| Set/exercise/session **notes**, "show next time", "always for this exercise" | P1 |
| **Plate-loading line** (bar weights, plate inventory, single-stack/bar-only) and dumbbell inventory | P2 |
| Swap / replace exercise mid-workout, remove, reorder, superset naming + per-round rest | P1 |
| Per-exercise rest, rest-timer "Set current", focus mode, workout layouts (Cards / List / Compact), exercise chips | P2 |
| **Log a past workout**, edit a saved workout, change date/time/duration, "repeat today" | P1 |
| Swipe gestures on sets/routines (left delete, right copy), copy set / copy routine | P2 |
| Day notes (Sick / Travelling / Injured) that silence the missed-day nudge | P3 |
| Cardio: speed unit, incline %, `.fit` export for Garmin | P3 |
| Dumbbell "each / both" weight semantics; bodyweight / assisted / weighted modes | P2 |

### Plan & schedule
| Feature | P |
|---|---|
| **Rotation / "loop"** plan mode (queue of routines that doesn't care about weekdays) vs Fixed Week | P1 |
| 4 starter plans (PPL, Upper/Lower, Full Body, 5×5) + **fit to my equipment** | P2 |
| **Equipment profiles** (Home/Gym) filtering library, picker and flagging routine exercises | P2 |
| "Up next" / "Week complete" on Home; run two routines in one session | P2 |

### Stats & body
| Feature | P |
|---|---|
| **Fatigue** view on the muscle map (Ready / Recovering / Fatigued) ← the thing you noticed | P1 |
| **Strength** view (retained strength, weeks since training), weekly muscle volume vs plan | P1 |
| **Structural balance** (Poliquin / Thibaudeau / ATG ratio tables → weakest lift) | P2 |
| 1RM formula picker incl. a 7-formula blend that reads RIR | P2 |
| Per-exercise history, per-set charts, "where you drop off" | P2 |
| **Body measurements** (waist, arms, body fat, custom) with their own curves | P1 |
| **Progress photos** + before/after compare; photos/videos attached to workouts | P2 |
| Weekly-average weight curve, weigh-in editing, "weigh in before workouts" toggle | P2 |
| Share workout as image / text; new-PR summary | P3 |
| "Compare with others here" (anonymous medians from an instance) | P3 – needs server |

### Exercise library
| Feature | P |
|---|---|
| Favourites; "Explore muscles" (tap a muscle → exercises); similar exercises | P2 |
| Equipment-type & exercise-type filters; English-name display options | P2 |
| Custom exercises with photo/GIF/video + video link | P2 |
| Bundled licensed media: **do not port** — see §4 | — |

### Notifications, timers, alerts
| Feature | P |
|---|---|
| Rest timer alerts: sound choices (Bell, Beep-beep, Whistle, Soft…), play on silent, flash, vibrate-on-silent | P2 |
| **Native rest-timer notification** (Android `RestTimerService` + `RestAlertReceiver`): countdown stays visible and fires with the screen off | P1 — **this is the Android counterpart of what you want on iPhone** |
| Missed-workout nudge with 3 tones (Friendly / Guilt-trip / Drill sergeant) | P3 |

### Accounts, sync, platform (mostly irrelevant to the Vercel build)
Password sign-in & email, multiple passkeys, QR/code device pairing, phone↔self-hosted-server sync
with offline queue and conflict handling, Cloudflare Access service tokens, in-app APK updater,
auto-backup to `Documents/openGym` or a chosen folder, backup `.zip` with media, import from Hevy by
API key, Health Connect write-back, **gym-card QR scanner** (camera), secure storage for API keys.
→ **P3 for the standalone web build** (no backend / Android-only). Backup-with-media and Hevy API
import are the two worth carrying over.

### AI Coach
APK has a **bring-your-own-API-key coach that runs on the phone** (no server), plus workout debrief,
"improve a routine", Coach history and a "compare" mode. The repo's coach (the fork's addition) is
server-side only and is hidden in standalone/mobile. Note the overlap: upstream now has its own Coach,
so the fork's would need reconciling, not simply re-applying.

### What the repo has that the APK doesn't
The fork's server-side Coach and its admin screen; the `VITE_STANDALONE` Vercel flavor. Everything
else on that side is rewording.

---

## 3. Plan A — close the parity gap

### 3.1 Recommendation: rebase on upstream, don't hand-port

~1,450 new strings means dozens of features with interlocking state-schema changes (sets gained
warm-up/drop/burst/side/pyramid fields; the plan gained rotation; settings were regrouped). Re-typing
that from a minified bundle would be slow and fragile and would have no tests. The APK's source is
AGPL upstream; bring it in as source.

1. **Identify the upstream** — the git history says `alexpcosta/opengym @ 678bf5b`, the README says
   `DuarteSantos8/openGym`. I need you to confirm the right one, and to let me attach it
   (it's outside this session's GitHub scope until you do).
2. Create an integration branch; merge upstream's latest release tag (≥ v1.4.1).
3. Re-apply the fork's two deltas on top:
   - `STANDALONE` flag + Vercel config (small; likely trivial).
   - AI Coach: decide drop / keep / merge with upstream's. This is the main design decision.
4. Resolve the media question (§4) so the Vercel build still works.
5. Run the full test suite (upstream's plus the repo's), build all flavors (`build`, `build:vercel`,
   `build:mobile`), click through in Chromium via Playwright.
6. Ship in two steps: parity merge first, with no new features, then Plan B.

Effort: ~1–2 days if upstream merges cleanly; the unknown is how far the fork diverged.

### 3.2 If upstream can't be merged
Port in priority order, one PR per group, each ending with tests: (1) Fatigue/Strength/volume muscle
views, (2) body measurements, (3) log-past-workout/edit, (4) warm-ups + notes + drop/rest-pause,
(5) rotation plan, (6) equipment profiles + starter plans, (7) the rest. Estimated several weeks;
not recommended.

---

## 4. Risks you should know about

- **Exercise media license.** The APK bundles ~13,000 stills/clips licensed *to openGym for use in
  the openGym app only* (Gym visual; `exercise-media/NOTICE.md` forbids reuse in other apps/sites).
  Do not copy those into this repo or a public Vercel deploy. The Vercel build must keep loading the
  separate jsDelivr dataset (`frontend/.env.vercel`). Upstream 1.4.1 identifies exercises by numeric
  ids tied to that licensed library; the merge must keep a working media/ID path for the web build,
  or the web build shows no animations. Needs checking early.
- **AGPL.** Merging upstream source is fine; hosting a modified version over a network (Vercel) means
  offering source — this repo being public already covers it.
- **State-schema migrations.** Merging 1.2.3→1.4.1 data formats: back up before upgrading real data;
  the standalone build keeps everything in browser storage.
- **Bundle size.** The main chunk already exceeds the chunk-size warning; upstream will grow it.

---

## 5. Plan B — iPhone + live workout display (Dynamic Island / Lock Screen)

### 5.1 What I understood you want
"dynamic added" = **Dynamic Island**, and "always active on the AUD" ≈ a persistent live display. I read
it as: while a workout is running, a **Live Activity** on the Lock Screen and in the Dynamic Island
showing **the exercise / machine, the set (e.g. 3 of 4), and seconds left in the rest** (and a running
time during the set). Tell me if you meant something else.

### 5.2 The hard constraint
**Dynamic Island and Live Activities cannot be done from a web app / home-screen PWA — only from a
native iOS app** (ActivityKit + a SwiftUI Widget Extension, iOS 16.1+). The Vercel build installed via
"Add to Home Screen" can't show them, whatever we do in JavaScript. So there are two tracks:

| Track | What it gives you | Cost |
|---|---|---|
| **B1. Native iOS app** (Capacitor shell + widget extension) | Live Activity, Dynamic Island, Lock-Screen timer, rest-over notification while locked | Needs a Mac + Xcode; sideloaded (Apple blocks other installs; the project deliberately avoids the App Store) |
| **B2. Better PWA on iPhone** | Best the web can do: always-visible in-app HUD, accurate timer after backgrounding, screen kept awake | JS only; ships via Vercel |

Apple facts that shape B1 (from Apple's documented behavior; **I haven't run any of this**):
- Dynamic Island hardware is iPhone 14 Pro and later; other iPhones show the same Live Activity as a
  Lock Screen banner.
- A rest countdown does **not** need per-second updates from the app: the widget uses
  `Text(timerInterval:)` / `ProgressView(timerInterval:)`, which the system animates itself, so it
  keeps counting while the app is suspended.
- Live Activity auto-ends after 8 h; fine for a workout.
- Free-Apple-ID sideloading: the signature expires every 7 days; I believe widget extensions are
  allowed but App Groups aren't on free accounts. Design below needs no App Group, but this must be
  checked on a real build.

### 5.3 B1 design
**JS ↔ native contract** (mirrors Android's `RestTimerService`, so Android could implement the same
plugin and the JS stays platform-neutral): a small local Capacitor plugin `LiveWorkout`:

```
start({ routine, startedAt })                      // workout begins → activity appears
update({ exercise, equipment, setIndex, setCount,  // after each set / exercise change
         plannedWeight, plannedReps,
         phase: 'work' | 'rest' | 'timed',
         endsAt?: epochMs })                        // rest or timed-hold deadline
end()                                               // finish / discard
```

**Hook points in this codebase:**
- `useStore` `active` workout → `start` / `end`.
- `Workout.jsx` set completion & exercise change → `update` (exercise name from `exOr(e.id)`,
  equipment from the exercise data — the field exists, `exercises.js` `equipmentOf`).
- `useUI.startRest / addRest / stopRest / startWork / stopWork` → `update` with `phase` and
  `endsAt` (already stored as `timer.endsAt` / `work.endsAt`, which is exactly the shape needed).
- On `App` `appStateChange` resume → reconcile JS state from `endsAt` (the code already recomputes
  from timestamps on `visibilitychange`).

**Native pieces (new, all unverified until built):**
1. Widget Extension target `OpenGymLiveActivity` (SwiftUI): lock-screen layout + Dynamic Island
   compact / expanded / minimal. Compact: dumbbell glyph + rest countdown; expanded: exercise,
   "Set 3/4", target weight×reps, countdown ring.
2. `ActivityAttributes` file shared by app and extension targets.
3. `LiveWorkoutPlugin.swift` in the app target wrapping `Activity.request/update/end`.
4. `Info.plist`: `NSSupportsLiveActivities = YES`; fix `UIRequiredDeviceCapabilities`
   (`armv7` → `arm64`); raise deployment target to 16.1 (currently 14.0).
5. **Rest-over alert while locked:** schedule a `@capacitor/local-notifications` notification at
   `endsAt` (already a dependency) and cancel it on skip / add-time. This replaces the server push
   the web build uses (`/api/push/rest-timer`), which doesn't exist on Vercel.
6. Optional stretch: iOS 17+ interactive buttons on the Live Activity (**Done set**, **+15 s**) via
   App Intents.

**"Always active"** = the activity exists for the whole workout, not only during rests:
during a set it shows exercise + set + an elapsed counter; during rest it flips to the countdown; at
finish it ends. Weight/reps targets come from the progression engine (`progression.js`) which
already computes the next set's target.

**Build and delivery (decide with me):**
- *You have a Mac:* open `frontend/ios` in Xcode with your Apple ID, run on the phone.
- *No Mac:* I add a GitHub Actions macOS workflow that builds an unsigned `.ipa`; you re-sign and
  install it with AltStore/Sideloadly. Doable, slower to iterate, and I can't test signing here.
- The App Store is the only way around the 7-day expiry, and needs a paid developer account; the
  project's `NOTICE.md` already carries an AGPL §7 exception if that ever happens.

### 5.4 B2 — what to improve on the PWA regardless
Present today: apple-touch-icon, standalone display mode, safe-area CSS, wake lock, timestamp-based
timer. Gaps for iPhone I found:
1. Timer sounds (WebAudio) don't play while the phone is locked/backgrounded, and iOS has no
   `navigator.vibrate`; `sw.js` push needs a server that Vercel doesn't have → **in the standalone
   build, a locked iPhone gets no rest-over alert at all.** (Fix: only B1, or a small Vercel
   serverless push function + storage; the latter is real work for little gain.)
2. A persistent in-app "now" bar: today the `RestTimer` bar only exists during rest. Make a HUD that
   is **always visible during a workout**: exercise, machine, "Set 3/4", target, and the countdown.
   Works on every platform, including Android and desktop, and is the in-app twin of the Live
   Activity.
3. Add `apple-touch-startup-image` splash images, manifest `id`, correct `viewport` (the
   `user-scalable=no` blocks accessibility zoom).
4. The documented iOS storage-isolation problem (Safari tab vs home-screen app have separate data)
   → a first-run warning plus a prominent export/import.

### 5.5 Sequence

| Step | Output | Depends on |
|---|---|---|
| 0 | You answer §6 questions | — |
| 1 | Plan A merge (parity) | upstream access |
| 2 | B2: always-on workout HUD + PWA fixes (JS, testable here with Playwright) | step 1 preferably, otherwise on current code |
| 3 | B1: `LiveWorkout` JS bridge + Swift/Widget code + CI workflow | step 2's state shape |
| 4 | You build/install on an iPhone and report back; I fix what only a device shows | a Mac or the CI route |

Doing B2 before B1 means the data model for "current exercise / set / seconds left" is proven in the
browser before any Swift is written.

### 5.6 Testing honesty
Everything in B2 and Plan A I can build, unit-test and drive in a headless browser here. For B1 I can
write the Swift, plugin and CI, and run `xcodebuild` only if a macOS runner is available; I cannot
run Dynamic Island on a simulator or device from this sandbox. Expect one or two fix rounds after
your first on-device test.

---

## 6. Decisions I need from you

1. **Which APK version do you have?** (Settings → About, or the APK file name.) Is v1.4.1 right?
2. **Upstream:** which repo is the source — `DuarteSantos8/openGym` or `alexpcosta/opengym`? May I
   attach it to this session so I can merge from it?
3. **AI Coach:** keep this fork's server-side Coach, switch to upstream's, or drop one?
4. **Dynamic Island:** did I read it right (Live Activity: exercise/machine, set, seconds left)?
5. **iPhone delivery:** do you have a Mac with Xcode, or should I set up the no-Mac CI route?
6. **Which iPhone?** (Dynamic Island = 14 Pro or newer; older models get the Lock Screen version.)
7. **Do you need sync?** Standalone/Vercel keeps data in one browser. If you want the phone and
   laptop in sync, that's the self-hosted backend, not Vercel.
