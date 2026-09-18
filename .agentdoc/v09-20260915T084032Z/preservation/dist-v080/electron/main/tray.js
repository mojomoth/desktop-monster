"use strict";
// Tray + context menu (SPEC F23, Assumption 16). Electron-free by injection
// (persistence.ts pattern): Tray/Menu construction is passed in by
// src/main/index.ts, so the menu contents and the rebuild-on-mode-change
// behavior have real vitest coverage without an Electron process.
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUIT_LABEL = exports.RESET_LABEL = exports.SETTINGS_LABEL = exports.COLLECTION_LABEL = exports.INPUT_FALLBACK_LABEL = exports.INPUT_GLOBAL_LABEL = exports.TRAY_TOOLTIP = exports.TRAY_TITLE = void 0;
exports.buildTrayMenuTemplate = buildTrayMenuTemplate;
exports.getActiveTray = getActiveTray;
exports.setupTray = setupTray;
const settings_js_1 = require("./settings.js");
/** First (disabled) menu row; tests pin the version against package.json. */
exports.TRAY_TITLE = 'DesMon v0.8.0';
exports.TRAY_TOOLTIP = 'DesMon';
exports.INPUT_GLOBAL_LABEL = '입력: 전체 입력 연결됨';
exports.INPUT_FALLBACK_LABEL = '입력: 게임 창 안에서만 · 연결 안내…';
exports.COLLECTION_LABEL = '영웅과 모험 기록…';
exports.SETTINGS_LABEL = '설정';
exports.RESET_LABEL = '진행 초기화';
exports.QUIT_LABEL = '종료';
/**
 * Pure menu description for an input mode. In global mode the status row is
 * informational (disabled); in fallback mode clicking it opens the macOS
 * Accessibility settings pane so the user can grant the permission.
 */
function buildTrayMenuTemplate(mode, actions, gameScale = 1, title = exports.TRAY_TITLE, preferences, status, settingsError = false) {
    const inputStatus = mode.mode === 'global'
        ? { label: exports.INPUT_GLOBAL_LABEL, enabled: false }
        : { label: exports.INPUT_FALLBACK_LABEL, click: actions.openAccessibilitySettings };
    return [
        { label: title, enabled: false },
        inputStatus,
        { type: 'separator' },
        { label: exports.COLLECTION_LABEL, click: actions.openCollection },
        {
            label: exports.SETTINGS_LABEL,
            submenu: [
                { label: '게임 크기', enabled: false },
                ...settings_js_1.GAME_SCALES.map((scale, i) => ({
                    label: settings_js_1.SCALE_LABELS[i],
                    type: 'radio',
                    checked: scale === gameScale,
                    click: () => actions.setGameScale(scale),
                })),
                { type: 'separator' },
                ...(preferences ? [
                    { label: '음소거', type: 'checkbox', checked: preferences.muted,
                        click: () => actions.setMuted?.(!preferences.muted) },
                    { label: '화면 흔들림', type: 'checkbox', checked: preferences.screenShake,
                        click: () => actions.setScreenShake?.(!preferences.screenShake) },
                    { label: '시작 안내 다시 보기…', click: () => actions.showWelcome?.() },
                ] : []),
                ...(settingsError ? [{ label: '설정을 저장하지 못했습니다 · 다시 선택해 주세요', enabled: false }] : []),
                { label: title, enabled: false },
            ],
        },
        ...(status?.state !== undefined && status.state !== 'ready' ? [{ label: status.state === 'load-error'
                    ? status.reason === 'settings-write' ? '처음 설정을 저장하지 못했습니다 · 복구 안내…'
                        : '저장 파일을 읽지 못했습니다 · 복구 안내…'
                    : '저장 실패 · 자동 재시도 중…', click: actions.openCollection }] : []),
        { label: exports.RESET_LABEL, click: actions.resetProgress, ...(status?.state === 'load-error' ? { enabled: false } : {}) },
        { label: exports.QUIT_LABEL, click: actions.quit },
    ];
}
// Module-scope reference (Assumption 16): without a live reference the Tray
// would be garbage-collected and the menu-bar icon silently vanish.
let activeTray = null;
/** The currently live tray, if any (module-scope keep-alive; used by tests). */
function getActiveTray() {
    return activeTray;
}
/** Create the tray, apply tooltip + initial menu, return the rebuild handle. */
function setupTray(deps) {
    const tray = deps.createTray();
    activeTray = tray;
    tray.setToolTip(exports.TRAY_TOOLTIP);
    const refresh = (mode) => {
        tray.setContextMenu(deps.buildMenu(buildTrayMenuTemplate(mode, deps.actions, deps.getGameScale?.() ?? 1, deps.title, deps.getSettings?.(), deps.getSaveStatus?.(), deps.getSettingsError?.())));
    };
    refresh(deps.getInputMode());
    return { refresh };
}
