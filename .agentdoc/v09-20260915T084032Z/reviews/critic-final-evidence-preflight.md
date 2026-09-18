# Critic — 최종 증거 연결 사전 감사

감사: 2026-09-15 11:00 UTC. Host의 최종 처리 순서 확인을 반영했다.

범위: v9 run/config/HARNESS, ACCEPTANCE/HANDOFF와 native-05, visual-02, core-regression-2, postgres-03, artifacts-final의 연결. 이 보고서 외에는 수정하지 않았다. 앱·브라우저·빌드·테스트를 실행하지 않고 작은 파일 읽기·해시 비교만 수행했다. 큰 DMG/EXE 해시는 성능 관측 중 재계산하지 않았다.

## 판단

읽은 제품·네이티브·코어·PostgreSQL 증거에서 해시 불일치는 발견하지 않았다. 현재 저널은 모두 running이며 현 소스에 대한 AC/게이트가 일치하지 않아 verify가 거부되는 상태다. Host가 아래 최종 소스 검증 순서를 채택했으므로 이는 예정된 완료 처리로 남긴다.

성능 미완료와 승인된 외부 PENDING을 실패로 재분류하지 않는다. 제품·관측기 변경은 필요하지 않다.

## 합의한 최종 완료 순서

긴 성능 관측이 끝난 후 다음 순서로 처리한다.

1. 실제 결과를 반영해 docs/v0.9를 먼저 확정한다. 최종 Critic report 05와 초기 저장 verifier 정규화 기록을 연결한다.
2. 확정된 소스에서 정확한 `npm test && npm run lint && npm run typecheck` 및 등록된 모든 AC를 순차 기록한다. 필요한 하네스 verifier 검사 로그도 함께 연결한다.
3. 마지막 repackage 결과와 관측한 설치본의 ASAR 동일성을 확인한다. DMG·Windows installer/EXE·Windows app.asar를 포함하는 새 최종 manifest를 만들고 기존 기록은 보존한다.
4. native/visual/core/PostgreSQL/performance 증거와 해시를 최종 대조한다. 성능 comparison은 실제 다섯 관측이 완료된 뒤 생성·재검증한다.
5. Host의 최종 evidence report와 저널에 위 결과 및 유지되는 PENDING을 최소한으로 연결한다.
6. 의존 순서대로 저널 verify를 실행한다.

이 순서는 두 가지 함정을 피한다. `docs/v0.9`는 V09-01을 통해 모든 작업의 AC 다이제스트에 포함되므로 verify 뒤 문서를 바꾸면 AC가 오래된 증거가 된다. 또한 V09-08의 package 재실행은 DMG를 다시 만들 수 있으므로 manifest와 설치본 연결은 마지막 패키징 이후 확인해야 한다.

`run.mjs`의 verified는 등록 AC·게이트·로그 해시를 검사한다. Host의 별도 evidence report는 native/visual/core/PG/performance와 배포 파일 연결을 추가로 증명한다. 저널 verified만으로 이 모든 검사가 자동 실행됐다고 설명하지 않는다. 최종 소스 검증 뒤 추가 인계 결과는 다이제스트 대상 밖의 실행 세션 보고서에 기록한다.

## Windows unpacked payload 연결 권장

현재 `release/windows-manifest.json`에는 installer와 `win-unpacked/DesMon.exe`만 있다. 실제 게임 코드인 `win-unpacked/resources/app.asar`도 새 최종 manifest에 포함해야 unpacked 배포의 코드까지 연결된다. Host가 이 항목을 마지막 manifest에 추가하기로 확인했다.

이번에 읽은 Windows ASAR는 967,288 bytes, SHA-256 `5f3d30336a3c4b34b8e949000bf60b7d0556ab154ac0cf111583ae7eaa35b510`이다. 그 안의 coordinator/net 모듈은 현재 dist와 일치했다. macOS ASAR와 전체 해시가 다르다는 사실만으로 제품 불일치라 판정하지 않았다.

## 독립 확인한 증거

| 증거 | 결과 |
|---|---|
| native-05/native.json | sources+artifacts 243개 해시 일치. 최초 23개·재시작 6개 검사 PASS. 각 런의 패키지 모듈 109개 대조 성공. |
| visual-02/visual.json | artifacts 14개 해시 일치. 실제 표본 410개, 보고된 70/135 geometry, errors 없음. |
| core-regression-2.json | binding 61개 해시 일치. 기존 200개 paired regression 성공 증거 유지. |
| postgres-03.json | sourceHashes 5개 일치. 실제 PostgreSQL 16.15 성공 기록 유지. 운영 DB 검증으로 확대하지 않음. |
| 설치본·현재 macOS release ASAR | `3692e162a73de3df7e596ee0756277dfe3496b26edd1591f6e1ce994ad00f044`로 일치. native/visual/HANDOFF/artifacts-final과 연결됨. |
| artifacts-final.json | 다섯 파일 존재·크기 일치. 작은 windows-manifest/설치 ASAR 해시 일치. 큰 DMG/installer/unpacked EXE 전체 해시는 관측 후 확인으로 남김. |
| 기존 게이트·스모크 | 기록상 73 files / 1,063 tests PASS, SMOKE_OK. 최종 현 소스 PASS로 재해석하지 않음. |
| verifier 초기 저장 정규화 | 원래 실패, 이전/현재 verifier 해시, 같은 observer/protocol, baseline 재검증, 합성 검사 2/2 PASS 기록 보존. |

감사 시점 전역 다이제스트는 `41d8631ce952f1a8d7e96258011ab7a7d97eaacb935e4466e7e338f76ab058ca`이며, 저널의 마지막 게이트 값과 달랐다. 모든 V09-01~08 작업의 `verifiableNow=false`를 읽기 전용으로 확인했다. 위 합의 순서에서 새 AC/게이트를 기록할 예정이다.

## PENDING 유지

performance-02의 나머지 실제 시간 관측은 진행 중이다. Windows 실기기/CI, 실제 Steam AppID·SDK·설치, 운영 DB 선행 배포, 기존 사람 관찰은 승인된 외부 PENDING이다. 이 감사는 이들을 실패나 완료로 바꾸지 않는다.
