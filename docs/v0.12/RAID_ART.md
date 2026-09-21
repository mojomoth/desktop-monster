# v0.12 레이드 아트·예상 화면 승인 기록

이 파일은 사람이 쓰는 승인 원장입니다. `.harness/v12/loop.mjs --stage A`가 V12-08에서 멈추면
`.agentdoc/<run>/preview/*.png`(인게임 카운트다운 / 경고 `참여` 버튼 / 전투 중 / 승리, 레이드 메뉴 5카드
상태별, 픽셀 팝업 4종, 보스 5종·아이템 10종 보드)를 열어 보고 아래 규칙대로 한 줄을 추가하십시오.

- 승인: `approved: <sha256 of preview/index.json> by <이름> at <ISO-8601>`
- 거절: `rejected: <sha256> reason: <무엇을 어떻게 바꿀지>` — 그러면 `--stage A`를 다시 실행했을 때
  해당 레인(`codex-lane` 재라운드)이 돌고 새 PNG가 생성됩니다.

`node .harness/v12/raid-preview.mjs verify <run>/preview/final.json`는 마지막 `approved:` 줄의 해시가
현재 소스(raidScene, raidBoss/*, raidEquipment, menu/raid, menu/popup, fixtures)의 캡처 해시와 같을 때만
통과합니다. Host·Codex·크리틱은 이 줄을 쓸 수 없습니다.

## 라운드 기록 (loop.mjs가 채움)

| 레인 | 라운드 | 변형 선택 | 크리틱 | 보드 |
|---|---|---|---|---|

## 승인 줄
