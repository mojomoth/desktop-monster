# v0.9.1 인계

## 구현

- `.harness/v91`을 명시적으로 실행한다. 기존 Ralph의 CURRENT=v3는 유지한다.
- `src/server/gold.ts`는 보호 잔고·stake·일일/동일 상대 한도 정책이다.
- `src/core/gold.ts`는 누적 PvP 순변동과 오프라인 미정산액을 정확한 정수로 반영한다.
- `src/main/coordinator.ts`는 저장·CAS·복구·수신 확인과 재생 완료 확인을 직렬화한다.
- `src/main/defense.ts`는 알림 API와 독립된 5초 조회를 담당한다.
- `src/renderer/game.ts`는 사냥 상태를 보존하며 별도 전투 장면과 재생 대기열을 운영한다.
- `src/renderer/index.ts`와 메뉴는 상대 이름·전투 중 상태 및 변경 잠금을 표시한다.

서버는 새 전투에 `mode: gold-v1`을 요구한다. `/v1/me`의 `pvpMode`와 wallet 지원을 확인한
클라이언트만 새 스냅샷 CAS를 올린다. 구확정 동료 이동/회수 영수증은 복구 경로로 남는다.

## 다시 검증하기

```sh
npm test && npm run lint && npm run typecheck
node --test .harness/v91/run.test.mjs .harness/v91/audit.test.mjs
node .harness/v91/balance.mjs verify .agentdoc/v091-20260917T024712Z/balance-01.json
node .harness/v91/runtime.mjs verify .agentdoc/v091-20260917T024712Z/native-06/native.json
npm run smoke
npm run package
npm run package:win
```

새 네이티브 실행은 `node .harness/v91/runtime.mjs APP_PATH NEW_OUTPUT_DIR`를 사용한다.
기존 결과 디렉터리를 덮어쓰지 않는다. 앱·dist/static이 같은 소스인지 검사하며, 입력 훅과
외부 네트워크를 막고 두 합성 계정의 실제 서버 핸들러를 사용한다. 통합 리뷰는 `audit.mjs`의
init→next→submit→report 순서로 Designer→Critic→Balance→Playtester를 수집한다.

## PostgreSQL 및 운영 전환

이번 로컬 환경에서는 서버 바이너리/응답 가능한 daemon이 없어 실제 PG 검사가 실패했다.
`postgres-01.json`과 `postgres-environment-01.json`을 실패·환경 근거로 보존했다.
새 의존성 설치나 기존 DB 삭제로 우회하지 않았다.

응답하는 로컬 PostgreSQL에서 이번 검증이 소유한 `desmon_v091` DB를 마련한 뒤,
DB 소유자가 접속 사용자와 일치하고 DB comment가
`desmon-v091-check:v091-20260917T024712Z`인지 확인한다.
`node .harness/v91/postgres-check.mjs LOCAL_TEST_URL .agentdoc/v091-20260917T024712Z/postgres-02.json`
은 새 스키마에서 migration·원자 정산·rollback·CAS·ACK·재시도 결과를 MemoryStore와 대조한다.
기존 스키마/테이블을 DROP하지 않는다. 출력 경로를 달리하면 DB comment의 세션명도 맞춰야 한다.

클라이언트 배포 전에 이 검사를 통과하고 공유 DB의 모든 서비스가 구형 약탈을 쓰지 않도록
전환한 다음 서버를 먼저 배포·검증해야 한다. 이 작업에서는 운영 서버에 연결하거나 배포하지 않았다.
Windows 실기기·Steam·장시간 성능·사람 관찰의 대기 범위는 [ACCEPTANCE](ACCEPTANCE.md)를 따른다.
