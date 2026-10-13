# Nurture

**Good things grow with a little care**

A small, local-first React + TypeScript prototype: a paper-and-doodle garden for the things you want to nurture. No accounts, services, analytics, streaks, or backend.

## Run

Use Node.js 22.12+ (Node 24+ recommended).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production preview, run `npm run build` and then `npm run preview`.

## A little tending

- Hover over a plant for a tiny wiggle. Click or tap it to open **Water**, **View history**, and **Edit**. Clicking elsewhere closes the menu.
- Choose **Water**: the can swoops in above the plant, tilts, pours **four doodled drops**, and leaves after the plant smiles. The can is decorative, not draggable.
- Choose Water on more plants while it works; their turns are queued in order. Requests already in progress or waiting in the queue are not duplicated.
- Water an already-watered plant again whenever you like. Every turn replays the watering and happy reaction; the calendar still records just one care day per local date.
- **View history** opens the monthly calendar. **Edit** opens directly into the name editor, with an option to remove the plant.
- Drag plants to rearrange the garden. Moving the plant currently being watered stops its unfinished pour; queued plants use their latest positions when their turn arrives. Removing a plant removes its pending turn.
- Opening a panel does not interrupt watering. Escape outside a menu or dialog cancels unfinished watering and clears the queue. Already-recorded care is preserved.
- **My Garden** lets you visit, rename, or remove plants. **Grow something new** offers eight ideas, a custom name, and all thirteen supplied plant types.

### Keyboard and motion

Tab to a plant and press **Enter** or **Space** for its menu, **W** to water directly, or arrow keys to rearrange it (Shift moves farther). Within a menu, arrow keys and Home/End select items; Escape closes it and restores focus to the plant. History also includes a Water action. Dialogs contain focus and support Escape.

Reduced motion removes wiggles, bounces, floating hearts, animated droplets, swooping, and animated tilting. A stationary can, static dotted pour, and the same happy face communicate care.

## Local persistence

Your garden is stored under `nurture.garden.v1` in this browser's local storage. Layout, habit names, plant types, distinct care dates, and onboarding/celebration state survive refresh. Updates are saved synchronously at the end of a plant drag or a care/management action.

Daily happiness is derived from the **local calendar date**, not an elapsed 24-hour interval. An open page checks at local midnight, on focus/visibility changes, and periodically for clock or timezone changes. Plants never wilt; a new day changes only their daily smile. Long-term `growthStage` stays independent and does not advance in this prototype.

Storage failures appear visibly. Unreadable or unsupported saved data is **not overwritten**: a temporary garden stays in memory until a successful retry. Clearing browser storage removes the garden. There is no cross-device or cross-tab synchronization.

Fonts and all artwork are served locally; the running app makes no third-party requests. Plants use the supplied transparent neutral/smiling PNG pairs, and the can and droplets use the supplied watering-can PNGs. The image files are unchanged; display framing removes their transparent margins without editing their pixels.

Old saved fern, tulip, and wildflower types load as Monstera, cream orchid, and hydrangea respectively. Their habit names, positions, history, and growth state are preserved.

## Code map

- [Garden](src/components/Garden.tsx), [Plant](src/components/Plant.tsx), and [useWatering](src/hooks/useWatering.ts) handle the physical experience.
- [PlantMenu](src/components/PlantMenu.tsx) handles the contextual actions, light dismissal, keyboard navigation, and viewport-aware placement.
- [Artwork](src/lib/artwork.ts) defines the supplied image pairs, shared display frames, and image-specific soil/spout anchors.
- [Watering geometry](src/lib/watering.ts) uses those anchors for mirrored can placement, animation timing, and queue order.
- [Garden data](src/lib/garden.ts) and [useGarden](src/hooks/useGarden.ts) own calendar behavior, validation, and persistence.
- [PlantArt](src/components/PlantArt.tsx) displays the supplied illustrations without synthetic foliage, pot, or face layers. See [the visual asset guide](ART-ASSETS.md) before replacing illustrations.

## Checks

```sh
npm test
npm run lint
npm run build
npm run test:e2e
```

The unit suite covers data validation and legacy migration, local dates, single-day care, image framing and transparency, per-plant watering geometry, queue eligibility, and droplet timing. Playwright tests supplied-art coverage, rendered nozzle alignment, mouse/touch menus, automatic and repeat watering, four non-looping drops, serial watering, cancellation, rearranging, keyboard access, reduced motion, persistence, midnight rollover, editing, history, and storage errors.

The browser suite uses an installed **Google Chrome**, two isolated desktop/touch contexts, and local port **5178**. It starts a Vite server automatically, or reuses the local preview if one is running. Screenshots and failed-test traces go in the ignored `test-results` directory. It never uses your personal Chrome profile.
