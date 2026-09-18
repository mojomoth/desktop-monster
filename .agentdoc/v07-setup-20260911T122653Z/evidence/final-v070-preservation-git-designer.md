# Git 원본 보존 연결 조사

- 실제 agent: `/root/designer`
- 관측 HEAD: `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`
- 조사 시각(UTC): 2026-09-13T02:32:27.055926+00:00 → 2026-09-13T02:32:29.002915+00:00
- 결과: 요청된 여섯 SHA-256 모두 현재 로컬 Git blob에서 정확히 일치하는 바이트를 찾지 못했다. 이는 현재 파일 누락·삭제·사용자 변경 손실 판정이 아니다.

## 실제 읽기 범위

`git cat-file --batch-all-objects`가 열거한 전체 1,968개 blob, 60,029,364 bytes를 `git cat-file --batch`로 읽어 SHA-256을 계산했다. 결론에 사용하는 두 명령은 `git --no-replace-objects`로 실행했고, 모든 blob의 Git SHA-1 객체 ID도 원시 바이트로 다시 확인했다. 도달 가능한 이력뿐 아니라 열거된 비도달 loose/packed 객체도 포함한다.
열거 목록 SHA-256: `77d3a16e93493addc4ee02dd8b1d4b5d9989cf2f49b6f40281a3994abcd7b1a6`. 조사 전후 목록이 동일했다.

각 경로의 보조 이력은 `git --no-replace-objects log --all --reflog --format=%H -- <path>`로 읽고, 반환된 commit마다 `git --no-replace-objects show <commit>:<path>` 원문을 해시했다. 정확한 argv·종료코드·stdout 해시·모든 commit/blob/파일 SHA는 인접 JSON에 기록했다. 최초 탐색에서는 replacement 비활성 옵션 없이 같은 read-only log/cat-file 명령을 사용했으며 결론은 비활성화 후 다시 검증했다.

| 경로 | 요청 원본 SHA-256 | 경로 이력 commit / 고유 blob | 정확 일치 |
|---|---|---:|---|
| `tests/expedition.test.ts` | `44ee1c22c53d78f6a225f107e9ad0a0b3a6a8d1ae066d158beafb6722199df10` | 0 / 0 | 없음 |
| `tests/hero.test.ts` | `49cbde0f159db2140ec25f40fa482fd5821bce3b0ed47e3310d50a49dda28fca` | 0 / 0 | 없음 |
| `tests/heroMenuReadiness.test.ts` | `a48744ec91c974edffaf0b76b895ace6881b3911edefc4e827392a498a1b3732` | 0 / 0 | 없음 |
| `tests/ipc.test.ts` | `8845abd33efc82bf383a39eb2cfb70b12235159658339fa72106d1a575e11ea0` | 6 / 6 | 없음 |
| `tests/menu.test.ts` | `f8249f15f43f2b9e732d5677de456a5d210895dd3e4eafcaeea264259e43a43f` | 7 / 7 | 없음 |
| `tests/progressV6.test.ts` | `358647f6232febd6c0f2d19a6115625b09752e499074b00220048b702406898a` | 0 / 0 | 없음 |

## 해석과 한계

- 원본 SHA는 Host가 전달한 최초179 manifest 관련 여섯 값을 사용했다. 이번 Git-only 조사에서 manifest·현재 테스트 내용·archive/contracts를 다시 읽거나 수정하지 않았다.
- 미커밋 사용자 변경은 Git blob으로 저장된 적이 없을 수 있다. archive/contracts 보존 연결은 Balance의 별도 조사이며 여기서 부재를 단정하지 않는다.
- 원격 저장소·다른 clone·이미 prune된 객체·파일시스템 snapshot·외부 백업은 범위 밖이다. fetch·checkout·reset·복구·Git 쓰기 작업을 하지 않았다.
- 비교는 변환 없는 원시 파일 바이트의 SHA-256이다. 유사 내용·줄바꿈 보정으로 다른 바이트를 원본이라고 인증하지 않았다. 파일 복구도 하지 않았다.
- source·package·dist·release·완료된 감사 응답은 건드리지 않았으며 이 두 신규 보고서만 작성했다. 테스트/빌드/앱/네트워크 실행은 없었다.

상세 근거: `final-v070-preservation-git-designer.json`.
