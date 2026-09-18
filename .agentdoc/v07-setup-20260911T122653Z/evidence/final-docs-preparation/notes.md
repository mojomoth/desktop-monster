# v0.7 README 적용 준비 — 미적용 초안

Designer `/root/designer`가 실제 README와 `tests/packaging.test.ts`를 읽고 만든 최소 변경 초안이다. 제품 README·package·lock·테스트·평가기에는 적용하지 않았다. 새로 쓴 파일은 이 문서와 `README-v07.patch.txt`뿐이다. 빌드·테스트·smoke·패키징·시뮬레이션을 실행하지 않았다.

- 기준 README SHA256: `bf9e79b4f37ac2627ca133c2258a3516902b747970a6c80de5bf401287e85cdd`
- 패치 적용 후 예상 README SHA256: `f046d5ad2866b7b55905564af664b8009dc8d2fc12976843e3c02f11fd3486ef`
- 패치 대상: `README.md` 한 파일. V06에서 Host가 파일 소유권을 등록한 뒤 적용한다. 기준 README가 바뀌면 사용자 변경을 보존하며 새 원본에 맞춰 패치를 조정한다.

## 변경 범위

v0.7 기능과 최종 검증 PENDING을 앞에 추가한다. 동료 Lv10 성장 상한을 양의 안전 정수 범위로 정정하고, Lv10 이상 환생의 Lv1·별+1·기본 힘2/level·전후 표시·확인/취소를 명시한다. 도감의 실제 선택/처치 판정과 레거시 실루엣·알림/ACK/목표, 실제 지정 PvP·파티·포커스, 공유 진행 안내를 반영한다. 실제7탭 구조도 설명한다.

v0.5·v0.6 설명과 v0.6 검증/실패 기록·DMG 링크는 과거 기록으로 보존한다. 마지막 v0.6 문단의 공용 `.app` 링크만 버전 고정 배포물처럼 보이지 않게 풀어쓴다. `release/mac-arm64/DesMon.app`는 현재 빌드 출력이고, 새0.7.0 DMG 경로도 아직 생성/검증 완료로 주장하지 않는다. 트레이 버전0.7.0과 패키지 경로는 아래 버전 고정과 함께 적용할 초안이다.

## V06에서 함께 필요한 버전 변경

1. `package.json`의 version, `package-lock.json`의 최상위 version 및 `packages[''].version`을 `0.7.0`으로 고정한다. 명령 이름과 스크립트는 바꾸지 않는다.
2. Host 소유권 등록 후 `tests/packaging.test.ts` 마지막 version bump 사례의 `expect(pkg.version).toBe('0.6.0')`만 정확한 `0.7.0` 기대값으로 바꾼다. lock의 두 일치 검사와 README의 동적 버전 산출물 검사를 그대로 유지한다. 이 README 패치에는 테스트 변경을 넣지 않았다.
3. 같은 대상 소스에서 등록 AC와 `npm test && npm run lint && npm run typecheck`를 새로 수행한다. 이후 실제 artifact와 smoke/package 근거를 별도로 만든다. 이 초안 작성 자체는 위 검증의 실행 또는 통과가 아니다.

## 기존 packaging 문구 계약

패치는 `npm ci`, `npm start`, `npm run package`, 양쪽 Accessibility 신원(`"Electron"`, `"DesMon"`, `node_modules/electron/dist/Electron.app`), unsigned/Open Anyway, save 경로/Reset Progress, Windows `config only`를 보존한다. `release/DesMon-0.7.0-arm64.dmg`와 `release/mac-arm64/DesMon.app`를 명시한다. boss/companion/fever/rebirth/volley/souls, Collection & Battle, A–Z notation, type chart/party/replay/reclaim/notification/Opponent list/wins/losses/24 hours/400과 기존 서버·오프라인·Render 문구도 보존한다. 테스트 삭제·skip·약화는 필요하지 않다.

## 적용 시 상태를 갱신할 범위

현재 초안은 최종0.7.0 Native330분, 정책별100seed×12시간, 네 역할 `audit.mjs`, smoke와 실제 패키지를 모두 최종 검증 PENDING으로 둔다. 탐색 후보나 이전0.6 검증을 PASS로 옮기지 않는다. Host가 이후 실제 완료 근거를 얻으면 ACCEPTANCE/HANDOFF와 일치하도록 실행한 범위만 갱신한다. 새 클라이언트 출시 전 운영 고레벨 호환도 별도이며 자동 커밋·푸시·운영 배포는 없다. 사람 관찰이 없으면 `humanChecks=PENDING`을 유지한다. 진행 후보 수치나 채택 ID는 README에 미리 고정하지 않았다.
