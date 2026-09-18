# Final v0.7 보존 사실 확인 — Balance

실제 `/root/balance`가 2026-09-13T02:13:44.553265+00:00에 읽기와 SHA-256 비교만 수행했습니다. 정식 결과감사, 작업 verified, 출시 판정을 대체하지 않습니다.

- 등록된 v5 35개와 `CURRENT` 1개는 **36/36**이 최초 179 manifest 및 이전 보존 기록의 SHA와 일치합니다. `CURRENT`의 실제 바이트는 줄바꿈 없는 `v3`이며 최초 SHA와 같습니다. 추가 v5 일반 파일은 0개입니다.
- 최초 179개 경로는 **179/179 존재**, **137개 현재 바이트 동일**, **42개 현재 바이트 변경**, **누락 0개**입니다. 현재 소스 변경은 승인된 개발이 진행된 상태의 차이이며, 이 확인은 개별 변경의 승인 여부를 다시 판정하지 않습니다.
- 현재 파일 또는 불변 보관물에서 최초 전체 바이트를 연결한 것은 **161/179**입니다. 아래 **18개 테스트**는 검사한 원본 보관물과 Git 객체에서 최초 SHA의 전체 바이트를 찾지 못했습니다. 현재 파일은 모두 존재하며, 원본 삭제·손실로 단정하지 않습니다.
- 원래 데모 스크립트 4개는 압축 내 원본 SHA **4/4 일치**, 현재 파일은 등록된 lint 수정 후 SHA **4/4 일치**입니다.
- 사전 앱 압축 **110,070,702 bytes**, 일반 파일 **297/297**은 원래 manifest와 일치하며 symlink **14개**도 압축에 있습니다. manifest의 나머지 10개는 **DMG 5개 + blockmap 5개**이고 압축 대상이 아니었습니다. 이번 확인은 live `dist/release`를 읽지 않았습니다.

최초 제품 압축은 92개 일반 파일(src/static/package 88개 등록 파일과 tsconfig 4개)을 보존하며, 최초 테스트 전체 압축은 아닙니다. 별도 원본 중 `balance.test.ts`, `ipcV5.test.ts`, `packaging.test.ts`는 최초 SHA와 일치했고, `collection.test.ts`는 Git commit `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`의 불변 객체와 일치했습니다. 이후 시점 원본이 존재한다는 사실만으로 시작 바이트와 같다고 보지 않았습니다.

초기 전체 바이트를 연결하지 못한 테스트:

- `tests/discoveryV5.test.ts`
- `tests/engine.test.ts`
- `tests/expedition.test.ts`
- `tests/formulas.test.ts`
- `tests/hero.test.ts`
- `tests/heroMenuReadiness.test.ts`
- `tests/ipc.test.ts`
- `tests/menu.test.ts`
- `tests/net.test.ts`
- `tests/progressV5.test.ts`
- `tests/progressV6.test.ts`
- `tests/progressionV5.test.ts`
- `tests/renderer.test.ts`
- `tests/save.test.ts`
- `tests/server/app.test.ts`
- `tests/server/opponents.test.ts`
- `tests/server/pgTransaction.test.ts`
- `tests/server/pvp.test.ts`

시작 git status의 106개 항목(개별 파일 93개, 디렉터리 13개)은 현재 모두 존재합니다. 개별 파일 중 `.gitignore`, `README.md`, `tsconfig.test.json`은 179 manifest에 없습니다. tsconfig는 초기 제품 압축에 있고, README의 0.7 버전 변경 전 원본은 `candidate-18/version-freeze.json`에 등록된 SHA와 일치합니다. `.gitignore`·README의 세션 시작 SHA와 13개 디렉터리의 재귀 바이트 불변은 이 자료로 인증하지 않습니다. 개인 save/auth는 읽지 않았습니다.

보존 근거:

| 자료 | 실제 SHA-256 |
| --- | --- |
| 최초 179 manifest | acfe8e51bcd87e86f48805e10ad6ea8a97718bcb1acf0ff69973c08ce26acf35 |
| 최초 제품 압축 | 8b0abb32fb0960f495a18e197a5510d35010df5890b0962294f4f9de37023aeb |
| 최초 평가기 압축 | 6bb7de7279d59bb4d23db94ebf1d10f58675dc227d19891befb49ac96661cbb8 |
| 데모 원본 압축 | 73368e4c61f6510ca46f8e5769bc6bd5453c331653efdec830acf6528f1eec42 |
| 사전 앱 manifest | cd40fbd5f9ec01c5ea9460281b4d516293795c4b1cc52428d396b6519e5c4a87 |
| 사전 앱 압축 | a9ee6046924970f742a0bc5884141a282378d32af9aabe4bb631ad616923ba15 |
| Designer 사전 인벤토리 | b48ea673202dd2aee4a2c0de14d7a5ad7fe76458b1979acf67727ac6e9fb6564 |
| Host package 전 readiness | 3b8029c51667c854ad2f7aba4bc5b604af0fc9ee046e483553b9b2bb8fe517bd |

Designer 인벤토리와 Host 사전 readiness가 기록한 과거 307개 live 일치 사실은 그 시점의 관측입니다. 승인된 package 이후의 현재 0.7 앱에 같은 SHA를 요구하지 않았습니다. 제품/평가기/원본 자료는 수정하지 않았으며, 신규 출력은 이 문서와 대응 JSON뿐입니다. 등록 파일은 확인 시작과 종료 SHA가 같았습니다. 예상 SHA 불일치: 0개.

전체 파일별 비교, 원본 위치, 검색 범위와 한계는 `final-v070-preservation-balance.json`에 기록했습니다. 원본 복구·재생성이나 검증 재실행은 하지 않았습니다.

테스트의 현재 파일 존재, 최초 전체 원본의 복구 가능성, 금지된 삭제·skip·약화 여부는 별개입니다. 이번 SHA 확인은 마지막 항목의 코드 의미 검토를 수행하지 않았으며, 미연결 18개를 금지된 테스트 변경의 증거로 쓰지 않습니다.
