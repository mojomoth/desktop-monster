"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkpointLabel = checkpointLabel;
exports.mountRecoveryUi = mountRecoveryUi;
function checkpointLabel(c) {
    return `${new Date(c.at).toLocaleString('ko-KR')} · Lv.${c.level} · 최고 단계 ${c.bestIndex} · 동료 ${c.companions}`;
}
function mountRecoveryUi(doc, api) {
    const list = doc.getElementById('checkpoint-list');
    const status = doc.getElementById('checkpoint-status');
    const reset = doc.getElementById('reset-progress');
    const refresh = doc.getElementById('refresh-checkpoints');
    if (!list || !status || !reset || !refresh)
        return;
    let busy = false;
    const reload = async () => {
        try {
            const rows = await api.listCheckpoints();
            list.replaceChildren();
            if (!rows.length)
                list.textContent = '아직 백업이 없습니다. 초기화·복원 직전에 자동으로 생성합니다.';
            for (const row of rows) {
                const item = doc.createElement('div');
                item.className = 'checkpoint-row';
                const label = doc.createElement('p');
                label.textContent = checkpointLabel(row);
                const button = doc.createElement('button');
                button.type = 'button';
                button.className = 'btn';
                button.textContent = '이 시점으로 복원…';
                button.addEventListener('click', () => { void act(() => api.restoreCheckpoint(row.id), '선택한 시점으로 복원했습니다. 온라인 데이터는 연결 시 확인합니다.'); });
                item.append(label, button);
                list.append(item);
            }
        }
        catch {
            status.textContent = '백업 목록을 읽지 못했습니다.';
        }
    };
    const act = async (work, success) => {
        if (busy)
            return;
        busy = true;
        reset.disabled = true;
        refresh.disabled = true;
        status.textContent = '';
        try {
            const reply = await work();
            status.textContent = reply.ok ? success : reply.error ?? '취소했습니다.';
        }
        catch {
            status.textContent = '작업을 완료하지 못했습니다. 다시 시도하세요.';
        }
        finally {
            busy = false;
            reset.disabled = false;
            refresh.disabled = false;
            await reload();
        }
    };
    reset.addEventListener('click', () => { void act(() => api.resetProgress(), '진행을 초기화했습니다. 아래 백업에서 복원할 수 있습니다.'); });
    refresh.addEventListener('click', () => { if (!busy)
        void reload(); });
    doc.getElementById('progress-recovery')?.addEventListener('toggle', () => { if (!busy)
        void reload(); });
    void reload();
}
if (typeof document !== 'undefined')
    mountRecoveryUi(document, window.desmon);
