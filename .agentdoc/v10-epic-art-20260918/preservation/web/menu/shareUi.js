import { parseSave } from '../core/save.js';
import { displayNameOf } from '../core/monsters.js';
import { drawShareCard, SHARE_CARD_SIZE } from './share.js';
/** One subscription and one reusable dialog, independent of the menu renderer. */
export function mountShareUi(doc, api, options = {}) {
    const opener = doc.getElementById('share-open');
    if (!opener)
        return () => { };
    const element = (tag, id, label = '') => {
        const node = doc.createElement(tag);
        node.id = id;
        node.textContent = label;
        return node;
    };
    const dialog = element('dialog', 'share-dialog');
    dialog.setAttribute('aria-labelledby', 'share-title');
    const heading = element('h2', 'share-title', '모험 내보내기');
    const note = element('p', 'share-note', '미리보기를 연 순간의 기록입니다. PNG를 저장하거나 복사해 원하는 곳에 공유하세요.');
    const kind = element('select', 'share-kind');
    kind.setAttribute('aria-label', '내보낼 대상');
    const kinds = [
        ['hero', '현재 영웅'], ['companion', '동료 한 마리'], ['party', '현재 필드 파티'],
        ['codex', '도감'], ['field', '현재 전투 장면'], ['pvp', '최근 대전 결과'],
    ];
    for (const [value, label] of kinds) {
        const option = element('option', '', label);
        option.value = value;
        kind.append(option);
    }
    kind.value = 'hero';
    const companions = element('select', 'share-companion');
    companions.setAttribute('aria-label', '내보낼 동료');
    const codex = element('select', 'share-codex');
    codex.setAttribute('aria-label', '내보낼 도감');
    for (const [value, label] of [['hero', '영웅 도감'], ['monster', '몬스터 도감']]) {
        const option = element('option', '', label);
        option.value = value;
        codex.append(option);
    }
    codex.value = 'hero';
    const preview = element('canvas', 'share-preview');
    preview.width = SHARE_CARD_SIZE;
    preview.height = SHARE_CARD_SIZE;
    preview.setAttribute('role', 'img');
    preview.setAttribute('aria-label', '내보낼 PNG 미리보기');
    const pages = element('div', 'share-pages');
    const previous = element('button', 'share-previous', '이전');
    previous.type = 'button';
    const pageLabel = element('span', 'share-page');
    const next = element('button', 'share-next', '다음');
    next.type = 'button';
    pages.append(previous, pageLabel, next);
    const status = element('p', 'share-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const actions = element('div', 'share-actions');
    const file = element('button', 'share-save', 'PNG 저장');
    file.type = 'button';
    const copy = element('button', 'share-copy', '이미지 복사');
    copy.type = 'button';
    const closeButton = element('button', 'share-close', '닫기');
    closeButton.type = 'button';
    actions.append(file, copy, closeButton);
    dialog.append(heading, note, kind, companions, codex, preview, pages, status, actions);
    const style = element('style', 'share-style');
    style.textContent = `
    #share-dialog { width:calc(100vw - 32px); max-width:460px; max-height:calc(100vh - 32px); overflow:auto; box-sizing:border-box; padding:16px; color:#deeed6; background:#140c1c; border:2px solid #6dc2ca; font:inherit; }
    #share-dialog::backdrop { background:#140c1ccc; }
    #share-dialog h2 { margin:0 0 12px; font-size:16px; }
    #share-dialog p { line-height:1.6; }
    #share-dialog select, #share-dialog button { font:inherit; color:#deeed6; background:#30346d; border:2px solid #8595a1; padding:8px; }
    #share-dialog select { width:100%; margin-bottom:8px; }
    #share-dialog button:focus-visible, #share-dialog select:focus-visible { outline:2px solid #dad45e; outline-offset:2px; }
    #share-dialog button:disabled { opacity:.45; }
    #share-preview { width:100%; height:auto; display:block; image-rendering:pixelated; }
    #share-pages, #share-actions { display:flex; align-items:center; gap:8px; margin-top:12px; }
    #share-pages[hidden], #share-dialog select[hidden] { display:none; }
    #share-page { flex:1; text-align:center; }
    #share-status { min-height:2em; }
    #share-actions { flex-wrap:wrap; }
  `;
    doc.head.append(style);
    doc.body.append(dialog);
    let latest = null;
    let frozen = null;
    let field;
    let battle = null;
    let page = 0;
    let pageCount = 1;
    let serial = 0;
    let loading = false;
    let busy = false;
    let valid = false;
    let fieldFailed = false;
    let battleFailed = false;
    opener.disabled = true;
    const render = () => {
        if (!frozen || !dialog.open)
            return;
        const selected = kind.value;
        companions.hidden = selected !== 'companion';
        codex.hidden = selected !== 'codex';
        pages.hidden = selected !== 'codex';
        const request = { kind: selected, save: frozen, companionId: companions.value,
            codexKind: codex.value === 'monster' ? 'monster' : 'hero', page };
        if (selected === 'field' && field)
            request.frameCanvas = field;
        if (selected === 'pvp' && battle) {
            request.save = parseSave(battle.before);
            request.replay = { opponentName: battle.result.opponent.name, opponentParty: battle.result.opponent.party,
                opponentHero: battle.result.opponent.hero, blows: battle.result.blows };
            request.result = { won: battle.result.win };
        }
        const ctx = preview.getContext('2d');
        valid = ctx !== null && (selected !== 'field' || field !== undefined) &&
            (selected !== 'pvp' || battle !== null) && (selected !== 'companion' || frozen.companions.length > 0);
        if (ctx) {
            const metadata = drawShareCard(ctx, request);
            page = metadata.page;
            pageCount = metadata.pageCount;
        }
        pageLabel.textContent = `${page + 1} / ${pageCount}`;
        previous.disabled = busy || page <= 0;
        next.disabled = busy || page + 1 >= pageCount;
        kind.disabled = busy;
        companions.disabled = busy;
        codex.disabled = busy;
        file.disabled = busy || !valid;
        copy.disabled = busy || !valid;
        if (!ctx)
            status.textContent = '미리보기를 만들지 못했습니다. 창을 닫고 다시 시도하세요.';
        else if (selected === 'field' && !field)
            status.textContent = loading ? '전투 장면을 가져오는 중…'
                : fieldFailed ? '전투 장면을 가져오지 못했습니다. 창을 닫고 다시 시도하세요.' : '현재 전투 장면이 없습니다.';
        else if (selected === 'pvp' && !battle)
            status.textContent = loading ? '대전 기록을 가져오는 중…'
                : battleFailed ? '대전 기록을 가져오지 못했습니다. 창을 닫고 다시 시도하세요.' : '아직 저장된 대전이 없습니다.';
        else if (selected === 'companion' && frozen.companions.length === 0)
            status.textContent = '아직 함께하는 동료가 없습니다.';
    };
    const close = () => {
        serial++;
        dialog.close();
        frozen = null;
        field = undefined;
        battle = null;
        busy = false;
        loading = false;
        valid = false;
        preview.width = SHARE_CARD_SIZE;
        opener.focus();
    };
    const decode = options.loadImage ?? ((dataUrl) => new Promise((resolve, reject) => {
        const image = doc.createElement('img');
        image.onload = () => { image.onload = null; image.onerror = null; resolve(image); };
        image.onerror = () => { image.onload = null; image.onerror = null; reject(new Error('image')); };
        image.src = dataUrl;
    }));
    const open = () => {
        if (!latest || dialog.open)
            return;
        frozen = structuredClone(latest);
        field = undefined;
        battle = null;
        loading = true;
        fieldFailed = false;
        battleFailed = false;
        page = 0;
        kind.value = 'hero';
        codex.value = 'hero';
        status.textContent = '';
        companions.replaceChildren(...frozen.companions.map(member => {
            const option = element('option', '', `${displayNameOf(member.speciesId)} Lv.${member.level} · ★${member.stars}`);
            option.value = member.id;
            return option;
        }));
        companions.value = frozen.companions[0]?.id ?? '';
        const current = ++serial;
        dialog.showModal();
        render();
        kind.focus();
        void Promise.allSettled([api.getFieldImage().then(async (data) => {
                if (!data)
                    return undefined;
                if (!data.startsWith('data:image/png;base64,'))
                    throw new Error('image');
                return decode(data);
            }), api.getLastBattle()]).then(([image, last]) => {
            if (current !== serial || !dialog.open)
                return;
            loading = false;
            field = image.status === 'fulfilled' ? image.value : undefined;
            battle = last.status === 'fulfilled' ? structuredClone(last.value) : null;
            fieldFailed = image.status === 'rejected';
            battleFailed = last.status === 'rejected';
            render();
        });
    };
    const exportImage = async (destination) => {
        if (!valid || busy || !frozen || !dialog.open)
            return;
        const current = serial;
        busy = true;
        status.textContent = destination === 'file' ? '저장 위치를 선택하세요…' : '이미지를 복사하는 중…';
        render();
        try {
            const result = await api.exportPng({ dataUrl: preview.toDataURL('image/png'), destination,
                name: `DesMon-${kind.value}${kind.value === 'codex' ? `-${codex.value}-${page + 1}` : ''}` });
            if (current !== serial)
                return;
            status.textContent = result.ok ? destination === 'file' ? 'PNG를 저장했습니다.' : '이미지를 복사했습니다. 원하는 곳에 붙여 넣으세요.'
                : result.canceled ? '저장을 취소했습니다.' : destination === 'file' ? '파일을 저장하지 못했습니다. 다시 시도하세요.' : '이미지를 복사하지 못했습니다. PNG 저장을 이용하세요.';
        }
        catch {
            if (current === serial)
                status.textContent = '내보내지 못했습니다. 다시 시도하세요.';
        }
        finally {
            if (current === serial) {
                busy = false;
                render();
            }
        }
    };
    opener.addEventListener('click', open);
    kind.addEventListener('change', () => { page = 0; status.textContent = ''; render(); });
    companions.addEventListener('change', () => { status.textContent = ''; render(); });
    codex.addEventListener('change', () => { page = 0; status.textContent = ''; render(); });
    previous.addEventListener('click', () => { if (!previous.disabled) {
        page--;
        status.textContent = '';
        render();
    } });
    next.addEventListener('click', () => { if (!next.disabled) {
        page++;
        status.textContent = '';
        render();
    } });
    file.addEventListener('click', () => { void exportImage('file'); });
    copy.addEventListener('click', () => { void exportImage('clipboard'); });
    closeButton.addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    const unsubscribe = api.onStateChanged(raw => { latest = raw == null ? null : parseSave(raw); opener.disabled = latest === null; });
    api.reportMenuReady();
    return () => {
        serial++;
        unsubscribe();
        opener.removeEventListener('click', open);
        dialog.remove();
        style.remove();
        frozen = null;
        field = undefined;
        battle = null;
    };
}
const bridge = typeof window === 'undefined' ? undefined : window.desmon;
if (typeof document !== 'undefined' && bridge) {
    const dispose = mountShareUi(document, bridge);
    window.addEventListener('unload', dispose, { once: true });
}
