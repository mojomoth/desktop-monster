### Raid menu tab view + pixel popup — `src/menu/raid.ts`, `src/menu/popup.ts`, `static/menu.html`, `static/menu.css`

This lane produces the EXPECTED MENU SCREEN and the pixel popup that replaces every native dialog. It runs on
fixture data (no bridge): V12-12 wires it to IPC later. Do not edit `src/menu/index.ts`.

1. `static/menu.html`: ninth tab `<button class="tab" id="tab-raid" type="button">레이드</button>` after 대전 and a
   `<div class="panel" id="raid" hidden></div>`; a popup host `<div id="popup-host"></div>` at the end of body.
   `static/menu.css`: tabs stay on ONE row at 560 px (reduce `.tab` horizontal padding to 6 px), `.raid-card` states
   `locked|open|countdown|confirming|battle|settled`, `.raid-art` (96 px wide, `image-rendering:pixelated`, silhouette via
   canvas tint not CSS), condition rows, capacity/priority lines, `.popup` modal: pixel frame (stepped 2 px border with
   box-shadow, DB16 palette `#140c1c/#442637/#deeed6/#dad45e/#d04648`), title in the 3×5 pixel font feel (letter-spacing,
   uppercase for Latin, Korean in monospace), two/three pixel buttons, dimmed backdrop, no images, no transitions longer than 150 ms.
2. `src/menu/raid.ts`: `mountRaid(doc, root, send) => (view: RaidLiveResponse | null, now: number) => void` following
   `mountCodex`'s style (`src/menu/codex.ts`): five cards in rotation order (current boss first; the other four always
   silhouetted with `???`), `raidBossCanvas(doc, element, silhouette)` drawing `RAID_BOSS_SPRITES` at scale 1 with
   `tint: SILHOUETTE_COLOR` when locked, element badge, condition rows `○/✓ 레벨 30 이상 · 2/3` from `view.raid.conditions`,
   `정원 k/N`, priority note while `priorityUntil > now`, countdown `레이드 시작까지 hh:mm:ss`, and ONE button whose label/state
   follows the phase: `참여` (gathering & I qualify & not mine) / `레이드 참여` (countdown, joinable) / `참여 완료` (aria-disabled) /
   `정원 마감` / `참전 확인` (confirming, joined, not confirmed) / `전투 중` / result line `순위 k/N · XP +a · G +b · 아이템 <name> · 수령 완료`.
   Mounted rows in a `Map<raidId, Card>` with a `contentKey` guard so 1 s pushes never rebuild DOM or steal focus.
   `send` receives `{type:'participate', conditionId}|{type:'join'}|{type:'confirm'}`.
3. `src/menu/popup.ts`: `mountPopup(doc, host) => { open(spec): Promise<string>, close(), isOpen() }` with
   `spec = {title, body: string | string[], buttons: [{label, value, primary?}], cancelValue?}`; `role="dialog"`, `aria-modal="true"`,
   focus moves to the primary button, Tab is trapped inside, Esc resolves `cancelValue ?? buttons.at(-1).value`; one popup
   at a time, later `open` calls queue. Provide four ready-made specs in the same module for the preview and for V12-10:
   `raidConfirmSpec(view)`, `raidResultSpec(reward)`, `progressResetSpec(kind)`, `enhanceSpec(item, cost, risk)` (Korean copy).
Tests `tests/menuRaid.test.ts` and `tests/menuPopup.test.ts` with the `FakeEl`/`FakeDoc` pattern from `tests/menu.test.ts`:
five cards, silhouette pixels vs revealed, button label per phase, disabled buttons carry no listener, countdown text,
same view → identical nodes (`===`), popup open/close/queue/focus/Esc/button values, `tests/menu.test.ts` tab-row count 9.
