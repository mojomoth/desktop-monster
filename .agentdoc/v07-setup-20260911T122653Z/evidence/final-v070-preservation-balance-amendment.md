# 보존 사실 확인 보완 — Balance

실제 `/root/balance`가 2026-09-13T02:30:26.693844+00:00에 기존 저장소 스냅샷을 읽기 전용으로 추가 대조했습니다. 기존 보고서 JSON `9920743c…` 및 MD `e83abd48…`는 바이트를 변경하지 않았습니다. 정식 결과감사·verified·출시 판정은 아닙니다.

최초 179개 중 전체 원본 바이트의 연결 범위가 **161 → 173개**로 늘었습니다. `.agentdoc/v06-20260910T063253Z/baseline/source.tar.gz`에서 기존 미연결 원본 **12개**를 정확한 시작 SHA로 확인했습니다. 압축은 **491,103 bytes**, SHA **917ea66d2be5e9837b947004e5e27b699433db1e1853542c6edf42a21d544274**, tar member **201개**입니다. 최초 등록 파일과 겹치는 164개 중 **132개 동일**, **32개 다른 버전**이므로 이 압축 전체를 v7 시작 상태로 인증하지 않았습니다. 파일은 추출하지 않고 등록 member의 스트림을 해시했습니다.

추가 연결된 테스트: formulas, discoveryV5, progressionV5, engine, renderer, net, save, progressV5 및 server/app, server/opponents, server/pgTransaction, server/pvp. 앞서 이미 연결한 collection과 balance를 포함하면 현재 변경 테스트 14개가 이 압축의 최초 바이트와 같습니다.

최초 전체 원본 미연결 **6개**:

| 경로 | 시작 SHA-256 |
| --- | --- |
| `tests/expedition.test.ts` | `44ee1c22c53d78f6a225f107e9ad0a0b3a6a8d1ae066d158beafb6722199df10` |
| `tests/hero.test.ts` | `49cbde0f159db2140ec25f40fa482fd5821bce3b0ed47e3310d50a49dda28fca` |
| `tests/heroMenuReadiness.test.ts` | `a48744ec91c974edffaf0b76b895ace6881b3911edefc4e827392a498a1b3732` |
| `tests/ipc.test.ts` | `8845abd33efc82bf383a39eb2cfb70b12235159658339fa72106d1a575e11ea0` |
| `tests/menu.test.ts` | `f8249f15f43f2b9e732d5677de456a5d210895dd3e4eafcaeea264259e43a43f` |
| `tests/progressV6.test.ts` | `358647f6232febd6c0f2d19a6115625b09752e499074b00220048b702406898a` |

6개 현재 파일은 모두 존재하고 앞선 확인 때의 SHA와 같습니다. 기존 v7 `contracts/*` 파일 126개, v7 baseline 압축 4개, 이전 v5 `input-code.tar.gz`, 저장소 내부 이전 `.agentdoc`의 이름이 명시된 소스 보관본을 추가 검사했으나 나머지 6개의 전체 원본 일치는 찾지 못했습니다. 이전 앱 ZIP과 개인 save/auth, raw 측정, Native 이미지, live `dist/release`는 읽지 않았습니다. 전체 디스크 검색은 하지 않았습니다.

v0.6 완료 후 `evidence/source-delta.json`(SHA `1fa265543c319a9543072a8950b0523e5907374deb95e69ebb6d12cab2442b46`)에는 6개 모두의 after SHA가 v7 시작 SHA와 일치한다고 기록돼 있습니다. 따라서 과거 해시의 출처는 연결되지만, 이 JSON은 전체 소스 원본을 보관하지 않으므로 복구 가능한 바이트로 집계하지 않았습니다.

미연결은 검사 범위 안에서 해당 SHA의 전체 파일을 찾지 못했다는 뜻입니다. 현재 테스트의 누락, 원본 손실, 금지된 삭제·skip·약화를 뜻하지 않습니다. 해당 의미 검토는 별도이며, 제품·테스트 수정/복원 또는 실행은 하지 않았습니다. 파일별 member·SHA 비교와 검색 범위는 대응 amendment JSON에 있습니다.
