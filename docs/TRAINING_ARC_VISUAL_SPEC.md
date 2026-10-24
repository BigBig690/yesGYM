# Training Arc 2.0 — Visual Spec

**Edition:** Romance anime × shoujo editorial × romcom diary × fitness RPG

**Status:** Direction for the current visual redesign

**Scope:** Presentation, navigation, identity graphics, companion gallery and muscle-map visualization. Existing training behavior and stored data remain authoritative.

## Design intent

Training Arc should feel like a personal training journal with the warmth of a romance-anime diary and the clear status language of a fitness RPG. The interface balances a cinematic dark canvas with paper, blush, lavender and sky details; expressive editorial type; manga panel marks; and a large portrait stage. Dense training controls stay calm and readable; visual intensity is concentrated in page openings, the selected companion, and real milestones.

The visual language is original to Training Arc. It does not reproduce a franchise interface, logo, character art, or dialogue. Existing local companion portraits remain unchanged and retain their current rights caveat.

## Existing product constraints

- Keep React, TypeScript, Vite, the existing feature structure, and central localStorage state.
- Keep schema version 2, stable routine and exercise IDs, session snapshots, progression receipts, backup format, six accent choices, and the current Yotsuba default / existing Miku compatibility.
- Preserve existing functions and display values from real app data. Do not add decorative strength, defense, or intelligence stats.
- Use the existing 26-exercise catalog and its local start/peak illustrations. Do not add remote image dependencies.
- The muscle map uses the locally bundled `body-muscles` 1.0.0 anterior/posterior SVG paths. Only completed-set metadata marks a mapped area; there is no physiological activation scale. Braquial and rhomboids are not separate library paths and remain listed as unrepresented instead of being merged into adjacent muscles.
- The gallery contains exactly the nine confirmed characters across three series. New installs default to Yotsuba. Existing saved choices remain intact except IDs from a temporary removed-character set, which are normalized to Yotsuba without changing other companion preferences or training data.

## Visual system

### Composition

- A narrow, persistent navigation rail frames a scrollable content canvas. The current page receives a clear accent rail and icon treatment.
- Page openings use a strong editorial title, small uppercase system coordinate, and one concise supporting sentence.
- One featured region carries the visual weight per screen. Supporting data uses fewer, denser panels with distinct hierarchy rather than a uniform grid of cards.
- Thin cut-corner outlines, chapter numbers, restrained manga hatch patterns, radial aura, and angled dividers provide the original graphic texture.
- Companion artwork is treated as an intentional portrait plate with a controlled crop, frame, caption and contextual dialogue. The editorial styling uses romance diary cues, subtle blossom marks and series filters. Portraits remain local assets; unavailable artwork uses the existing named fallback.
- Exercise illustrations retain their natural content and correct catalog IDs. Theme effects apply to the frame, never to the image itself.

### Tokens and six palettes

Retain the existing dark base and theme IDs: Purple Eclipse, Crimson, Azure, Emerald, Rose and Amber. Each theme defines foreground accent, soft accent, RGB accent, ambient light, edge light and low-contrast surface tones. Semantic success, warning and error colors remain independent from the selected theme. Components consume shared tokens; feature styles should not pin decorative purple when an accent token is intended.

### Type and motion

Use legible system sans-serif for controls, long-form content and data. Use compact display styling, tracking and line breaks for titles and HUD labels only. Use short opacity, color and small-position transitions for real interaction states. No movement is required to understand status; `prefers-reduced-motion` and the saved reduced-motion preference disable ambient and transition effects.

## Signature assets and components

- **Training Arc mark:** original inline/local SVG with angular arc and ascending path; remains legible at sidebar, welcome and small status sizes.
- **Chapter header:** coordinate label, display title and optional inline status.
- **Portrait plate:** frame, status notch, artwork or fallback, name and message.
- **Status panel:** existing XP and level data presented with an editorial meter.
- **Manga divider and hatch field:** CSS/SVG-native decoration, non-interactive and low contrast.
- **Muscle atlas:** front/back SVG plates built from selectable regions, each linked only to actual catalog muscle labels and accompanied by the current text list.

## Page application

- **Dashboard:** protagonist header, actual XP/title, focal companion art and contextual line; schedule/sequence and missions remain fact-based. Routine, analytics, library and progression routes retain existing destinations.
- **Routines and agenda:** current operations, statuses and snapshots are unchanged. Routine/exercise panels gain an editorial hierarchy and image frames.
- **Active training and warmup:** keep set logging and rest timer controls visually dominant. Exercise artwork stays close to the active exercise without reducing field access.
- **Exercise library and spreadsheet:** strengthen thumbnail alignment, filter grouping, detail hierarchy and no-result/empty states; retain actual catalog and last performance.
- **History, statistics, evolution and muscle atlas:** use compact visual summaries and accent-aware charts; calculations remain unchanged. Muscle atlas reads only actual completed-set summaries.
- **Missions, progression and medals:** distinguish available, in-progress, completed, claimed, locked, unlocked and equipped states with labels as well as symbols/color.
- **Companions:** increase portrait presence, show all nine confirmed characters, distinguish the three works and filter by series. Existing local portraits and valid saved selections remain; absent or failed artwork uses the named fallback.
- **Settings and backup:** preserve all controls and confirmations. Accent samples show a miniature surface preview; selection remains immediate and persisted through existing operations.

## Responsive behavior and accessibility

- Desktop uses the navigation rail and flexible page grid.
- At narrow widths, navigation remains reachable through the existing mobile bar/menu; panels collapse to one column and tables become cards or stack without horizontal page overflow.
- All SVG regions remain keyboard-operable and named; state is expressed by text/attributes as well as color.
- Focus rings use the current palette and remain visible. Portraits use meaningful alt text or a named fallback. Decorative geometry is hidden from assistive technology and cannot intercept pointer input.
- Keep touch actions comfortably sized and preserve access to all workout fields at 390 px viewport width.

## Benchmark notes

The comparison is about recognizable product patterns, not copying another product's visual identity:

- [Hevy feature overview](https://www.hevyapp.com/features/) demonstrates a focused workout log and progress feedback built around actual session data.
- [MuscleWiki](https://musclewiki.com/pt-br) makes the muscle map an entry point to exercise information; Training Arc will keep its own metadata and avoid implying that its map measures physiology.
- [AniGains](https://anigainsapp.com/) and [Fitscape](https://scape.fit/) make the training journey and next action explicit. Training Arc keeps its own progression formulas and rewards.
- [Apple Human Interface Guidelines — Motion](https://developer.apple.com/design/human-interface-guidelines/motion) is a reference for motion that communicates state without distracting from the task.
- [WCAG 2.2 PT-BR](https://www.w3.org/Translations/WCAG22-pt-BR/) informs keyboard access, focus, contrast and non-color status communication.

## Verification targets

1. The six accent IDs continue to drive the application-wide shared visual tokens.
2. The existing selected companion remains selected after the visual work; Yotsuba remains the new-install default.
3. Existing exercise illustrations remain locally bundled and correctly associated.
4. Muscle map selection stays aligned with real metadata and available by text and keyboard.
5. No business rule, schema, backup, session or progression behavior changes.
6. The anatomy view is an interactive React SVG using exact region path data from Body Muscles 1.0.0 under Apache 2.0. Front/back use the upstream coordinate ranges (35×93 per view). The app's explicit mapper is `src/features/statistics/anatomyMuscleMap.ts`; only linked exercise labels receive completed-session marks. The drawing is educational and is not a clinical assessment or activation measurement.

## Purple Eclipse visual audit update · 2026-10-23

### Companion art

- The same nine existing local companion portraits remain the source of all character imagery. The Dashboard gives the selected portrait a larger stage with an editorial scene label and blossom orbit. The companion page makes the selected card span two columns on wide screens, keeps franchise group treatment distinct, and uses a numbered archive tab for each original character. Selection, stored companion ID, Yotsuba fresh-install default, Miku compatibility, and image fallbacks remain unchanged.
- This pass added no character files. Rights to redistribute the existing anime artwork are still unconfirmed and are recorded in `ASSET_SOURCES.md` and `src/assets/companions/SOURCES.md`.

### Anatomical map architecture and mapping

- The page imports the actual `FRONT_MUSCLES` and `BACK_MUSCLES` paths from npm package `body-muscles@1.0.0`. The upstream package is framework-agnostic, exports 70+ regions, has no runtime dependency, and is licensed Apache-2.0; its upstream `LICENSE` and `NOTICE` are copied to `public/licenses/body-muscles/` and linked from the map.
- React renders a muted path layer for the whole body and exact interactive grouped path regions. A selected/recorded group highlights all anatomical subpaths contained by that group. The SVG controls use group-level geometry drawn from those exact paths, `role=button`, tab stops, `Enter`/`Space`, pointer hover and native title text; the accessible text list remains available.
- Mapper: chest upper/lower paths → `Peitoral maior`; shoulder front/side/rear → corresponding deltoid labels; biceps paths → `Bíceps braquial`/`Bíceps`; posterior paths explicitly named flexors → `Flexores do antebraço`; quads → `Quadríceps`; trapezius paths → `Trapézio`; lats → `Latíssimo do dorso`; posterior triceps, erectors, gluteal, hamstring, gastrocnemius and soleus paths → their exact catalog labels. The generic anterior `Forearm` paths do not distinguish flexors, so they have no exercise-metadata link. The mapper does not alter exercise IDs or catalog data.
- The Body Muscles source does not define separate brachialis or rhomboid paths. They remain text-queryable, explicitly labeled as having no separately drawn region; neither is attributed to biceps or mid-trapezius. Anatomy paths with no corresponding exercise metadata (e.g. abs/adductors) are selectable for anatomy context but report that no exercise data is associated.
- Visual states are categorical: neutral region, recorded association, selected region, keyboard focus and anatomy without exercise mapping. They use selected theme variables; no intensity value is rendered. Totals remain sourced from completed-session records and no sessions or statistics were changed.

### Six accent palettes

Purple Eclipse, Crimson, Azure, Emerald, Rose and Amber remain the persisted setting IDs. Their existing frame-level tokens provide the primary accent, soft accent, RGB accent, ambient/edge lighting and surface/border tones. The anatomy selection, record indication, keyboard focus, companion frames and editorial accents now consume those shared tokens. Neutral skin rendering and semantic success/warning/error colors are intentionally not retinted. Respect `prefers-reduced-motion` for the new hover and color transitions.

### QA follow-up · 2026-10-23

- The visual check found the Dashboard's `DAILY SCENE · COMPANION FILE` marker crossing the portrait caption. It now sits at the upper edge of the portrait plate. The previous fixed-blue action links and routine-management indicators were also moved onto `--accent` / `--accent-soft`, so they stay with the selected theme.
- All six palettes were manually selected and saved in Settings, then inspected on the Dashboard, companion feature/gallery and anterior muscle map. Purple Eclipse, Crimson, Azure, Emerald, Rose and Amber each produced a visibly distinct accent across page backgrounds, cards, borders, active navigation, selection controls and the anatomical highlight. The stored accent was reloaded and the persisted selection checked in-app for each palette; Purple Eclipse was restored at the end of QA.
- The posterior figure and its selection control were also opened on desktop. Its shape has head through feet and the selected region stays on its exact library path. The display is the package's educational body drawing; no path, muscle association or exercise record is treated as physiological activation.
- This inspection environment exposed a fixed desktop-sized browser surface and no viewport-resize/device-emulation capability. Mobile CSS remains in place, but a true 390 × 844 visual pass is still pending and is not claimed as completed.

## Companion presence across navigation · 2026-10-23

The selected character is now introduced through the shared `AnimeCompanionPanel` on each functional area that does not already have its own portrait composition. It uses the existing character ID resolver, the same selected companion persisted in `AppData`, the existing local portrait, and a context-specific note. It does not create or save a second selection. Dashboard keeps its larger hero art; the companion collection keeps its selected-character stage and franchise gallery.

| Main page | Character presentation | Page-specific framing |
|---|---|---|
| Dashboard | Selected companion in the existing large hero portrait | Journey and status hero |
| Rotinas | Selected companion in the shared editorial panel | Routine cards and editing |
| Exercícios | Selected companion in the shared editorial panel; exercise illustrations remain separate | Library notes |
| Treinar | Selected companion in a shorter contextual panel | Session / preparation cue; workout controls remain below and unobstructed |
| Histórico | Selected companion in the shared editorial panel | Training diary |
| Agenda | Selected companion in the shared editorial panel | Weekly planning |
| Estatísticas | Selected companion in the shared editorial panel | Records-based reading |
| Planilha | Selected companion in the shared editorial panel | Planned values versus last actual record |
| Evolução | Selected companion in the shared editorial panel | Comparison only when records support it |
| Mapa muscular | Selected companion in the shared editorial panel; anatomical figure remains primary | Recorded-set map note |
| Progressão | Selected companion in the shared editorial panel | Saved progression status |
| Missões | Selected companion in the shared editorial panel | Objective tracking |
| Medalhas | Selected companion in the shared editorial panel | Criteria-based milestones |
| Companheira | Selected character in the existing large feature stage; all nine remain grouped in the gallery | Character archive |
| Configurações | Selected companion in the shared editorial panel | Preference and local-data setup; backup controls remain functional |

### Component behavior

- `src/components/AnimeCompanionPanel.tsx` owns page captions and the common portrait composition. The portrait uses the character ID resolver and image failure fallback already used elsewhere. A page without a companion context (Dashboard or collection) does not receive a duplicate panel.
- Context statements are informational and avoid claiming a workout, reward, trend, or milestone happened. The chosen companion name and franchise remain visible alongside an image large enough to identify the selected character; on narrow screens the image remains above 99×116 px (86×104 px for the active session context).
- Frames, label, paper accents and edge lighting use the active accent and dark-surface tokens. CSS shapes are original decoration only; no new character art or remote image dependency was added. Entry/hover movement is short and disabled under either the app reduced-motion preference or system `prefers-reduced-motion`.
- The supplied 90 candidate links are indexed in `ASSET_SOURCES.md` for provenance research. This review opened the current TBS Ichika page and Aniplex Season 2 page. The current official character pages for My Dress-Up Darling and The Fragrant Flower Blooms with Dignity returned 403 to the browsing tool. Search, directory and fan-community links remain discovery references, not licenses. No new art was downloaded; the nine local portraits remain subject to the existing unconfirmed redistribution rights noted in `src/assets/companions/SOURCES.md`.

The page inventory is based on the actual 15 `AppPage` navigation entries in `src/components/AppShell.tsx`. The contextual panel is presentation-only: it does not change schema, backups, companion selection, sessions, exercise data, progression or training rules.
7. Run the existing test suite, typecheck and production build after implementation; only report visual browser inspection if pages were actually opened at desktop and mobile widths.
