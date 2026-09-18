독립 구현 리뷰 — `/root/critic`

검토 범위는 V07-02 할당 안전 수정 5개 파일이다. 현재 범위에서 남은 결함은 발견하지 못했다. 완료된 Round06 fun 응답을 수정하거나 release audit를 대신하지 않는다. Critic은 제품 수정·테스트·빌드·측정 및 검증 데이터 열람을 하지 않았다.

- `implementation.json`의 최초 before/after SHA를 실제 원본과 대조했다. 엔진 2파일은 준비 초안과 일치하며, save/collection/companion 테스트는 준비 초안에 아래 Infinity 후속 수정만 추가됐다. 기존 테스트 본문·단언은 제거하거나 약화하지 않았고 새 사례를 추가했다.
- `save.ts:272–278`은 모든 유지된 ID의 숫자를 고려하는 보정을 보존한다. 유한 초과 값·거대한 ID 숫자·양의 Infinity를 MAX_SAFE_INTEGER 소진 표지로 제한하며 기존 ID/동료를 지우지 않는다. 일반 잘못된 형식의 기존 fallback과 자연 포획 횟수를 역산하지 않는 의미도 유지한다.
- `collection.ts:178–204,310–334`는 로컬 번호의 양의 안전 정수·MAX 미만·원래 로스터 내 중복 여부를 검사한다. PvP는 lostId 제거 전에 검사하므로 삭제로 충돌을 숨기지 못한다. 고유한 s/r 전송은 MAX에서도 원래 ID로 수신하고 카운터는 포화한다. 기존 정원 및 미수신 경로를 바꾸지 않는다.
- `engine.ts:240–268`은 기존 보스 난수를 소비한 뒤 로컬 발급 가능성을 검사한다. 빈자리가 있어도 소진/불안전/중복이면 명단·번호를 유지하고 가짜 방출/영혼을 지급하지 않는다. 실제 처치의 XP/전리품과 정원 가득 찼을 때의 기존 방출은 유지한다.
- 새 회귀는 마지막 MAX−1 발급→저장/재시작→추가 발급 거부, 직접 잘못된 카운터, lostId와 같은 로컬 ID 충돌, 큰 s/r 전달·중복 전달, 반복 자연 포획에서 기존 고레벨 동료 보존과 RNG/방출/영혼 무변경을 확인한다. 신규 earlyCaptureCount 소비와 정원 보장 조건은 후속 V07-05 범위이며 이번 리뷰로 구현 완료 처리하지 않는다.

최초 발견과 해결: 첫 적용의 `save.ts:273–274`는 intField가 양의 Infinity를 먼저1로 되돌려, `parseSave('{"nextCompanionId":1e400}')`에서 소진 표지를 재무장할 수 있었다. Critic이 정적으로 지적했고 Host가 수정 전 회귀를 추가했다. `infinity-followup/before-fix.log`에는 실제1 FAIL/32 PASS 및 expected MAX/received1이 보존돼 있다. 현재는 양의 Infinity를 intField 이전에 MAX로 처리하며, 직접 Infinity·literal JSON1e400·serialize/parse 유지 단언을 확인했다. `infinity-followup/after-fix.log`의 4파일114 PASS를 읽었다. 이전114 PASS는 수정 후 근거로 재사용하지 않았다.

현재 검토한 파일 SHA256:

| 파일 | SHA256 |
| --- | --- |
| src/core/save.ts | e3ac4241ad02888394b436f9a7c037768c6fc4711b0dbe15e0e46ab0c276c6ac |
| src/core/collection.ts | 5bd191d014eaf9ef641f59bfe1d468e0d0686e7bf91f898b8ca77503890f6338 |
| src/core/engine.ts | b6a5e37e0e9c1deac157ca3349d0835511a64045fc5298db00ffee3cbc5f472b |
| tests/companionLevelsV7.test.ts | f7984cd1d49af4952f182e66d0e91ffdc3ba25f518329ba15037bbf8f0a6ea30 |
| tests/engine.test.ts | ea6f5d7c2f8274c9436466eb9715dcf412624cf20bed1afb5d39d9a44087af51 |

Host는 이 최종 소스의 등록 AC와 `npm test && npm run lint && npm run typecheck`를 새로 통과시킨 뒤 V07-02 상태를 판단해야 한다. 본 기록은 그 명령을 실행하거나 작업 verified·실제 Native·측정·출시를 인증하지 않는다.
