# DesMon 게임 분석 및 다음 업데이트

Host 겸 Playtester로 실제 10개 Native 관측·자연 330분3.023초·430개 참인 검사와 별도 900개 정책별12시간 원본을 검토했다. 전체 prompt/template과 세 실제 역할 응답을 읽고 원본·직접 본 화면·독립 계산으로 대조했다. 기준 첫 성공p50 45.61분/90분100 of100과 h70 자격전체p50 11시간16분36초를 확인했지만 h70 미도달50/선택0을 유지한다. C070 운영 서버 major와 D070 두 minor는 미해결이며 기술 승인·운영 출시는 보류한다. 분석 완료와 출시 검증은 다른 상태이고 humanChecks=PENDING이다.

상태: **분석 완료**. 발견된 오류는 아래에 남아 있으며, 실제 사람의 재미와 출시 여부는 확인하지 않았습니다.

- 소스 지문: `84e911f949feb04569668a77869ad43913dce1bf45c9afd34c9ff6cd239cc131`
- Electron E2E: **passed** · 430개 검사 · 20107.6초 실행
- 시뮬레이션: 5/15/30/45/60/90/120/240/480/600/720분 관측점. 실제 플레이 시간과 사람의 재미 검증이 아닙니다.
- 원본 근거: [Electron](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z/evidence/native/matrix.json), [수치 측정](/Users/jeongyounglee/work/repo/desktop-monster/.agentdoc/v07-setup-20260911T122653Z/evidence/release.json)

## 실제 실행과 미확인

| 분 | 프로필 | 실제 Electron 플레이 |
| --- | --- | --- |
| 5 | active | 5.00분 관측 |
| 5 | idle | 5.00분 관측 |
| 5 | intermittent | 5.00분 관측 |
| 15 | active | 15.00분 관측 |
| 15 | idle | 15.00분 관측 |
| 15 | intermittent | 15.00분 관측 |
| 30 | active | 30.00분 관측 |
| 30 | idle | 30.00분 관측 |
| 30 | intermittent | 30.00분 관측 |
| 180 | active | 180.02분 관측 |

- Nine independent 5/15/30-minute runs observe without menu choices; fresh idle has zero inputs.

- The independent continuous 180-minute active run visits the real hero menu every 10 minutes and selects the first available choice.

- Scripted diagnostic fixtures follow natural observation and are not natural acquisitions.

- Human fun and interruption remain PENDING; OS hooks, Accessibility and live PvP are separate.

## 기능 오류 · 논리 · 재미

### designer · /root/designer

최종 0.7 소스의 완료된 Native 10원본·430 checks·198 PNG와 900개 정책별 12시간 원본을 독립 검토했다. 등록 baseline의 첫 성공 전체 p50 2736.6초·90분 내 100/100, 마지막 h70 자격 전체 p50 40596초는 목표 범위다. h70 미도달 50/100·선택 0과 후기 새 획득 공백은 남는다. 자연 330분과 이후 fixture 진단을 분리했으며, 아래 두 minor 관측/재미 후속사항을 기록한다. 이는 Designer 결과 감사 응답이며 네 역할 감사 완료·출시 승인·사람 재미 확인을 뜻하지 않는다.

- **bug / 확신 high**: 직접 본 자연 메뉴·HUD와 post-natural 진단의 도감 공개/ACK, Lv11→1·별0→1·힘11→2 확인, 대상 변경 취소, 50행 PvP의 실제 Enter/Space·선택 ID·포커스는 원본 상태와 일치한다. 격리 진단 범위에서 새 기능 결함을 확인하지 못했으며, 짧은 관측의 readiness-null은 별도 기록 한계다.
  미확인: 합성 입력은 실제 글로벌 입력 권한·OS 알림의 사람 경험을 증명하지 않는다.; 로컬 PvP는 운영 서버 호환 증거가 아니다. 읽은 server-readonly-preflight/deployed-contract-static.md는 health가 보고한 구버전의 Lv11+ 거절·directory 부재를 제시하므로 호환 운영 SHA 확인 전 클라이언트 출시는 보류해야 한다.; Host가 이후 수행한 smoke/package·서버 AC는 본 Designer가 직접 재실행하거나 audit artifact로 재인증하지 않았다.
- **logic / 확신 high**: baseline 전체 100개와 성공자 조건부 통계를 구분했다: h70 자격 50/100의 조건부 p50은 20933.6초이고 미도달을 마지막에 정렬한 전체 lower p50은 40596초다. 자격·제시 각 50/100과 실제 선택 0은 첫 카드 정책 및 rare 3번 슬롯 코드와 부합하며, 실제 3번 선택 기능은 별도 fixture로 확인됐다.
  미확인: 관측된 Native 한 경로를 100 seed 분포와 동일시하지 않는다.; 원본에는 모든 보스의 포획 RNG·30명 전체 깊이 이력이 없어 후기 seed 차이의 개별 포획 원인을 확정할 수 없다.; 후기 roster 30·Lv1은 관리 없는 정책 결과이며 제거된 레벨 상한의 재발 증거가 아니다.
- **fun / 확신 medium**: v5 패턴의 Ambient→Surprise→Interaction→Reward→Collection 중 입력/처치·환생 보상은 계속되지만 새 수집으로 연결되는 간격은 길다. baseline 8→12시간에는 전원 추가 처치·환생했어도 새 영웅이 없는 60개, 새 처치종이 없는 78개, 새 포획종이 없는 100개가 있어 수치 목표 충족만으로 반복 재미를 확정할 수 없다.
  미확인: 사람 관찰이 없어 humanChecks/humanFun은 PENDING이다. 자연 메뉴 캡처도 사람이 선택을 이해했다는 근거가 아니다.; 희귀 선택 0은 고정 첫 슬롯 정책의 결과이므로 사람의 기피·발견 실패 비율로 해석할 수 없다.; 정책별 입력·메뉴 주기·지출·관리 방식이 함께 달라 유료 관리의 단독 인과효과를 추정하지 않는다.

- **D070-LATE-COLLECTION-GAP · minor · fun**: baseline은8→12h 전원 진행하지만 새 영웅0=60/100·새 처치종0=78/100·새 포획종0=100/100이다. 2→12h 새 획득 최대공백p50=11364.3초/worst34294.8초가 남아 반응·보상이 새 수집으로 이어지는 경험은 미확인이다. 등록 시간 목표 실패라는 뜻은 아니다.
  수정/실험: 후속 사람 관찰에서 기존 도감 목표와 선택적 동료 관리/교체 설명의 이해를 먼저 검증한다. 제시와 실제 새 획득 공백을 계속 별도 보고하며, 이 검증결과를 이용해 현재 수치·30000킬 조건·정책을 자동 조정하지 않는다.
  근거: `measure#/runs`
- **D070-ENDPOINT-READINESS-SAMPLING · minor · logic**: 30-active 종료상태와 PNG는 Lv17/REBIRTH READY인데 주기 기반 firstReadyElapsedMs는 null이다. 이를 준비 미도달이나 정확한 최초시각으로 읽으면 관측 결론이 틀린다.
  수정/실험: 현재 원본/null을 보존하고 보고서에 endpointReady와 최초시각 미확인을 구분한다. 향후 별도 등록된 관측기 개선에서는 최종 상태를 추가 표본으로 기록하되 주기 표본·비동기 save·정확한 사건시간을 혼동하지 않는다.
  근거: `e2e#/sessions/6`
- 근거 `e2e#/matrix/originals`: 완료 원본 10개 SHA와 모든198 PNG SHA를 직접 재계산해 일치 확인. matrix SHA45af28ccfa167f889b415ca187c5d9cf2d8179ef4d1cea5a5bf1c91785263c5c; 430개 check true/errors0. 준비 문서나 0분 preflight로 대체하지 않았다.
- 근거 `e2e#/observationMs`: 19803022.837542ms는 9개 5/15/30분×3프로필과 별도180분의 실제 자연 관측 합이다. 이후 fixture 시간은 자연 시간에 포함시키지 않았다.
- 근거 `e2e#/sessions/9`: 180-active:18회 10분 메뉴 방문·14회 실제 선택. 첫 준비2312052.202208ms/첫 선택2401183.300416ms; 종료Lv1·13077킬·3462764골드·동료30·영웅14. 짧은9개는 선택 없는 observe-only다.
- 근거 `e2e#/screenshots`: 직접 본 9개 자연 endpoint 및 long 자연 메뉴18개(163–180), endpoint181을 기록과 대조. long 경로 evidence/native/180-active-1789253244141.json.screenshots/natural-menu-{10..180}m.png, 180m-active.png. 180분 메뉴 gold3462763→후속end3462764는 순차 표본이며, HUD의5파티와 총명단30도 다른 값이다. 진단191–197의 도감/rare/환생/PvP도 직접 봤다.
- 근거 `e2e#/sessions/6`: 30-active endpoint는 Lv17/76킬/1493골드와 REBIRTH READY지만 firstReadyElapsedMs=null. 마지막 주기 표본 Lv16과 비동기 save/end flush의 차이로 정확한 최초시각은 미확인; 준비 미도달로 집계하지 않는다.
- 근거 `e2e#/checks/409/details`: legacy에서 선택한 영웅·처치한 몬스터만 이름/색/aria 공개. 이어지는410–415는 ACK정규화·목표·제시만으로는실루엣·한개선택공개·ACK·재시작을 확인한다. 진단PNG191/194와 실제 메뉴 코드를 대조했다.
- 근거 `e2e#/checks/416/details`: post-natural fixture=true/naturalAcquisition=false. 유효 offerSerial41의 h70 세 번째 실제 클릭→장착·collection·heroCounts·history 추가, 환생10→11/Lv22→1/XP7→0/필드80→0; 골드321/킬30000 유지. 알림1/goal완료/ACK h70 및 미선택 두 실루엣 확인. PNG192/193은 자연 h70 획득 증거가 아니다.
- 근거 `e2e#/checks/421/details`: PNG195와 일치하는 Slime Lv11→1/별0→1/기본힘11→2. checks418·420·422의 MAX_SAFE 저장 유지·취소 무변경·Lv250→251 대상변경 확인 무효화를 함께 읽었다.
- 근거 `e2e#/checks/425/details`: 실제 webContents.sendInputEvent keyDown/char/keyUp의 Tab/ShiftTab/Enter/Space와 요청opponentId=응답playerId=DOM선택을 확인. checks424·426·428·429 및 PNG196의 영웅+5동료/50행·동일버튼 보존·실제 지정ID까지 대조했다.
- 근거 `e2e#/checks/427/details`: 51번째 합성 상대 때문에 선택 행이 목록에서 빠지면 refresh로 포커스 이동, selected0/previewParty0/battleDisabled=true. PNG197과 일치하며 격리 실제 서버/클라이언트 진단이다.
- 근거 `measure#/targets`: 최종 release SHA46271facabdeb917748b50b46b2136246c0fd65281b5e76b350a7dcd1e6b1079. 등록 baseline 첫 전체p50=2736.6초,90분100/100; named 전체p50=40596초. 이미 완료된 최종0.7 900 raw 모두720분; 과거0.6 결과로 재인증하지 않았다.
- 근거 `measure#/settings/baseline`: active/free/uniform/management none/menuVisitSeconds0가 목표 분모다. 10분 Native 메뉴와 정책별100개×9 비교군을 합쳐 목표 통계로 만들지 않았다.
- 근거 `measure#/runs`: baseline과 같은 policy의100 raw records/checkpoints를 독립 집계: h70 eligible50/seen50/chosen0; 자격30개8h전·20개8–12h·50미도달. 같은seed8→12h kills 증가p50=17231(최소386),환생증가p50=80(최소2),선택파티 기본힘 동일68개. 누적 피해는 overkill 포함, partyPower는 DPS가 아니다.
- 근거 `measure#/scenarios/20/metrics`: baseline720분 kills p50=28754(2191–174866), roster30/Lv1. lastUnlockSec의20933.6은 도달50개의 조건부p50. longestDiscoveryGapSec는 seenHero/seenMonster 기록 간격이며 새 획득 간격과 구분한다.
- 근거 `measure#/runs/0/records`: 모든 baseline raw에서2h와12h 양끝을 포함해 고유(kind,id) 이벤트 간 최대공백을100ms정수로 재계산: seenHero/seenMonster p50=9158.5초,worst31089.4; chosenHero/killedMonster/capturedMonster p50=11364.3,worst34294.8. 해당 수집은 새 form/종이며 중복 포획·모든 보상 간격이 아니다.
- 근거 `measure#/method`: measure.mjs216–225의 seen 기준과 hero.ts221–250의 첫standard/셋째rare 선택을 대조. engine.ts241–269는 full30에서 새 동료를 교체하지 않고 정상포획을 방출/영혼으로 전환한다. 무료 경로·기존 대기·6콘텐츠 조건을 바꾸지 않았다.
- 근거 `e2e#/limitations`: 합성 입력·격리 save·post-natural fixture·로컬 PvP의 한계를 유지. 운영 호환, 사람 관찰, 실제 권한/알림과 최종 출시 판단은 이 화면 감사만으로 완료되지 않는다.

**비교한 대안 · 우선 선택: 기존 목표·동료 관리 안내의 사람 관찰**

- **기존 목표·동료 관리 안내의 사람 관찰**: 현재 수치·6조건·선택 정책을 유지하고 새 획득 공백 중 기존 도감 목표와 선택적 관리를 이해하는지 먼저 본다. 작은 조사로 정보 부족과 콘텐츠 소진을 구분할 수 있지만 실제 보상 빈도를 높인다는 보장은 없다.
- **희귀 세 번째 카드 선택 설명 조사**: eligible/seen/chosen의 차이와 미선택 도감 실루엣을 사람이 이해하는지 확인한다. 자연 첫 슬롯 정책이 놓친 선택 의미를 다루지만 후기 전반의 수집 공백은 해결하지 못한다.
- **비방해형 다음 목표 진행 표시 실험**: 기존 선택 목표의 남은 성과와 완료 후 실제 선택 필요를 자연 메뉴에서 더 쉽게 읽게 하는 후속안이다. 진행 가시성은 좋아질 수 있으나 새 콘텐츠를 만들지 않으며 잦은 알림은 ambient 성격을 해칠 수 있어 별도 등록·관찰이 필요하다.

**검증할 가설**

- 기존 목표에서 자격·제시·실제 획득 구분 정확도: 후속 사전등록 제안: 처음 보는 사람5명 중4명 이상이 세 단계를 구분하고 현재 필요한 행동을 설명한다. 아직 관찰하지 않았다.
  목표를 둔 이유: h70 자격/제시50와 선택0, 실제 세 번째 클릭 진단은 기능과 이해도를 분리해야 함을 보여 준다. 이는 제품 시간 목표를 바꾸는 새 AC가 아니다.
- 동료 환생의 전후 힘·확인/취소 이해: 후속 사람 관찰 제안: Lv11/힘11→Lv1/힘2 사례에서 확인 전 감소를 알아본 인원과 취소 이유를 기록하고 오해0을 목표로 삼는다.
  목표를 둔 이유: Native는 정확한 감소 표시·확인 기능을 증명했지만 손해를 감수한 선택의 의미를 사람이 이해했는지는 아직 모른다.
- 2–12h 제시 공백과 새 실제 획득 공백: 현 관측 기준 seen 최대공백p50 9158.5초와 acquired11364.3초를 별도로 보존하고, 후속 안내 실험의 효과는 새 사전등록·독립 관측 후에만 판단한다.
  목표를 둔 이유: 킬·환생의 지속이나 기존 영웅 재선택은 새로운 수집이 아니다. 현재 validation 결과로 수치를 튜닝하거나 사람 재미를 확정하지 않는다.

### critic · /root/critic

최종 S84e911f/Ec27f893의 release 900개와 Native 10원본·430 checks·198 PNG 해시를 독립 대조했다. baseline 첫 수락 전체 p50 2736.6초/90분 내 100 of 100, h70 자격 전체 lower p50 40596초를 재현했으나 h70 미도달 50/100·선택 0을 유지한다. Designer의 후기 수집 공백과 endpoint-readiness 관측 한계에 동의하며, 운영 서버의 구버전 계약을 major 미해결 사항으로 기록한다. 이 응답은 결과 분석이며 humanChecks/humanFun=PENDING, 운영 출시=PENDING이다.

- **bug / 확신 high**: 격리 Native에서 Lv11/250/MAX_SAFE 저장·재시작, 정확한 환생 손실 표시와 취소/대상 변경 무효화, 실제 50행 영웅·5동료와 지정 상대 ID/포커스 연결을 확인했다. 반면 최종 서버 capture의 live=PENDING이며 보고된 운영 커밋에는 Lv10 상한과 구형 PvP 계약이 남아 있어 로컬 기능 확인을 운영 호환으로 확장할 수 없다.
  미확인: 운영 register/upload/PvP/reclaim·DB를 호출하지 않았다. 구버전 계약은 health가 보고한 SHA의 로컬 Git 소스에 관한 사실이며 실제 배포 바이너리의 독립 attestation은 아니다.; 사람의 글로벌 입력 권한·OS 알림·업무 방해 경험은 미확인이다. Host의 이후 smoke/package/DMG/955 gates는 내가 재실행하거나 이 두 감사 artifact로 재인증하지 않았다.; 초기 개별 사용자 변경·모든 테스트 원본의 추적성 전체는 이 e2e/measure pair만으로 판정하지 않는다. 보존 조사와 별도 근거가 필요하다.
- **logic / 확신 high**: 900개는 9정책 각각 validation 1–100/720분이며 9900 checkpoint에서 금 잔액·수락 action 수·ready≤open≤accepted 연결을 재계산했다. 목표는 baseline 전체100 lower quantile이며 h70 조건부 20933.6초, 자격50/제시50/선택0과 구분된다. 180분은 실제18방문/14선택이고 30-active의 ready-null은 종료 Lv17 READY와 함께 읽어야 한다.
  미확인: 100개 중50개 도달의 전체 lower p50은 관측 성공 중 최댓값이다. 이 통계는 과반 또는 대부분이 12시간에 획득한다는 보장이 아니다.; Native 준비 시각은 저장 표본의 관측시각이고 첫 환생 시각은 실제 선택 완료 관측시각이다. 정확한 엔진 사건시각과 동일시하지 않는다.; 모든 보스 포획/명단 변동의 연속 trace가 없어 정책별 차이의 개별 RNG 원인을 확정하지 않는다.
- **fun / 확신 medium**: v5 장르의 즉시 반응·편안한 반복·발견·작은 선택을 적용하면 등록 성장 목표와 수집 기대는 다른 결과다. baseline 8→12h 전원 처치/환생은 늘었지만 새 영웅 없는60/100·새 처치종 없는78/100·새 포획종 없는100/100이 재현된다. 안내 이해도 조사는 합리적인 다음 조사지만 반복 보상의 가치나 업무 중단 비용까지 해결했다고 볼 수 없다.
  미확인: humanChecks/humanFun=PENDING: 사람이 재미·선택 의미·애착·주의 전환을 어떻게 경험하는지는 관측하지 않았다.; 희귀 선택0은 첫 슬롯 정책의 구조적 결과이며 사람의 레어 기피율이 아니다.; 훈련/미끼/재굴림 정책은 지출과 동료 관리·방문 주기가 함께 달라 단일 유료 기능의 인과효과나 모든 상황의 최적 전략을 증명하지 않는다.

- **C070-LIVE-SERVER-CONTRACT · major · bug**: 최종 클라이언트의 고레벨/지정 상대 계약에 대응하는 운영 호환 근거가 없다. 실제 최종 capture는 local121 tests/exit0이나 live=PENDING이다. health 보고 SHA28270992518dc5bfc9c1f89f700c0491eaf8d1ed의 api.ts104는 LEVEL_MAX=10, app.ts128/203–215는 Lv11+ 스냅샷을 저장 전400으로 거부하고,458–480에는 목록 라우트가 없으며358–394는 요청 opponentId를 무시한다. 같은 SHA/blob의 정적 반례이며 운영 인증 API를 실행한 결과로 주장하지 않는다. 격리 check423 성공으로 이 출시 전 계약 공백을 덮을 수 없다.
  수정/실험: 운영 출시PENDING을 유지한다. 서버 변경/커밋/배포는 별도 명시적 승인 범위에서만 진행하고, 호환 서버의 실제 보고 SHA·정확한 소스 매핑과 고레벨 왕복의 새 근거를 확보해 등록 server AC를 재수행한다. 소스/평가 지문이 바뀌면 영향 받는 검증과 감사를 새로 수행하며 현재 원본과 실패 이유를 보존한다.
  근거: `e2e#/checks/423/details`
- 근거 `e2e#/matrix/originals`: matrix SHA45af28ccfa167f889b415ca187c5d9cf2d8179ef4d1cea5a5bf1c91785263c5c 및 10개 원본 SHA·동일 S/E·각43 true checks/errors0를 직접 대조했다. 198 PNG 해시도 원본/집계에 각각 대조했으며 모든 화면을 시각 판독했다는 뜻은 아니다.
- 근거 `e2e#/observationMs`: 실제 자연 관측 합19803022.837542ms. 9개 short와 별도180분의 합이며 fixture 진단 시간은 제외됐다. 원본 startedAt/elapsedMs를 독립 비교해 순차 실행을 확인했다.
- 근거 `e2e#/sessions/9`: 18회 10–180분 방문/14선택, 첫 준비2312052.202208ms≤첫 선택완료2401183.300416ms. 모든 before/after 연결 및 최대 완료지연1267.079333ms를 직접 계산. natural-menu-40m/180m PNG를 직접 봤으며 종료 환생14/명단30/골드3462764와 메뉴 직전3462763을 구분했다.
- 근거 `e2e#/sessions/6`: 30-active 원본과 직접 본 endpoint PNG의 Lv17/REBIRTH READY, 마지막 Lv16 표본 사이 기록 간격29122.136875ms. electron-e2e.cjs229는 최종 flush를 readiness helper에 넣지 않는다. 최초시각은 미확인이고 null을 미도달로 바꾸지 않는다. 기존 supplemental report abf20e185ae18a5fbc529dd95d7a7f984fbaa6b26701c6167a839fcf817f627f 참조.
- 근거 `e2e#/checks/409/details`: 409–415의 선택 영웅/처치 몬스터만 색·이름·aria 공개, 제안만 한 카드 실루엣 유지, 실제 선택 후1개 공개/알림/ACK/목표/재시작을 읽었다. core collection.ts222–234의 실제 acquired 교집합과 부합한다.
- 근거 `e2e#/checks/416/details`: fixture=true/naturalAcquisition=false. 직접 본 세 번째 h70 카드와 단일 heroChoose/serial41 action, after 장착/보유/heroCounts/history/ACK·미선택 실루엣을 대조했다. 자연 획득0을 이 fixture로 대체하지 않는다.
- 근거 `e2e#/checks/418/details`: Lv11/250/9007199254740991의 expected=saved=resumed. MAX_SAFE를 넘는 성장은 허용하지 않는 안전 정수 계약이며 양의 안전 레벨을 Lv10으로 잘라 저장한 증거는 없다.
- 근거 `e2e#/checks/421/details`: 직접 본 환생 확인 PNG 및 실제 전후 Lv11→1/별0→1/힘11→2. 420 취소 무변경, 422 Lv250→251 대상 변경 후 확인 무효화도 읽었다. collection.ts270–280의 snapshot/별 overflow 경계, main/ipc.ts115–116의 필수 expected와 구분했다.
- 근거 `e2e#/checks/425/details`: 실제 inputTrace의 keyDown/char/keyUp,22개 trusted DOM 사건, Tab/ShiftTab/Enter/Space를 읽었다. 424는 고유50행 모두 hero+5party,428은 Enter e2e-103/Space e2e-101/mouse e2e-7의 요청ID=응답ID=DOMID. 선택 목록 PNG도 직접 확인했다.
- 근거 `e2e#/checks/427/details`: 51번째 상대 추가로 목록에서 밀려난 행의 포커스가 refresh로 이동하고 preview0/selected0/battleDisabled=true. 서버 계정 삭제를 실행했다는 뜻이 아니다. 426의 동일 버튼·행 유지와 점수 재정렬 후 포커스도 확인했다.
- 근거 `e2e#/checks/423/details`: 여기 업로드/목록/지정미리보기 성공은 격리 서버 진단이다. 별도로 실제 evidence/server/compatibility.json SHA9eeb9ad2554c1aea54100a354557ced0d91d9b2596476bedbdfa4ab3433241c4 및 tests.log 해시를 읽어 local121 tests/exit0·live PENDING을 확인했다. 내 compatibility-static-mapping.json b003e618dc1c60a3df8cbbc1d925316e5ffaaa5bd95f5e45eb7bc4c65a55d62d는 보고 SHA28270992518dc5bfc9c1f89f700c0491eaf8d1ed 대비35개 전체를 끝까지 대조해13일치/17불일치/5누락을 기록한다. 이 pointer를 운영 API 호출 증거로 쓰지 않는다.
- 근거 `measure#/targets`: release SHA46271facabdeb917748b50b46b2136246c0fd65281b5e76b350a7dcd1e6b1079. 직접 raw를 집계한 baseline 첫 전체p50=2736.6초/90분100 of100, h70 전체lower p50=40596초·도달50·조건부p50=20933.6초. populationQuantile의 floor((n−1)q)·null-last와 일치한다.
- 근거 `measure#/runs`: 900개 모두 해당정책의 seed1–100과720분 완료. rawSha256/protocolSha256를 JSON.stringify/sha256로 재계산했고9900 checkpoint의 초기금+수입−지출=잔액, 수락 action 누계, 최초 사건 순서에 불일치0이었다. 제품/측정기를 다시 실행하지 않았다.
- 근거 `measure#/runs/100/policy`: active/free/uniform/none에서 방문주기만600초인 비교군: h70 전체p50=25894.3초/89도달, 최종환생p50=67. 즉시수락 baseline은40596초/50도달/137환생이다. 따라서 환생 횟수 증가나 즉시 선택을 장기 목표의 항상 우월한 전략으로 볼 수 없다.
- 근거 `measure#/runs/600/policy`: 훈련+consume/600초는 h70 p50=16807초/100도달·지출p50=28875·최대동료Lv p50=67. reroll+reincarnate/120초는9969초/100도달·지출728000이다. 무료600초도89도달하므로 필수 과금 경로가 아니며 지출·관리·방문 복합 효과를 분리해 주장하지 않는다.
- 근거 `measure#/runs/0/records`: baseline100 전체에서8→12h 새영웅0=60,새처치종0=78,새포획종0=100; partyPower 동일68, 추가킬p50=17231/최소386·환생p50=80/최소2. 2h/12h 양끝 포함한 고유kind/id 사건 공백을100ms 정수로 재계산해 seen p50=9158.5초/worst31089.4, 실제새획득 p50=11364.3/worst34294.8을 재현했다.
- 근거 `measure#/method`: 현재 hero.ts225–256은 첫슬롯standard/셋째eligible rare, measure.mjs285는 첫카드만 선택한다. 9정책 모두h70 chosen0이 그 정책과 부합한다. engine.ts238–269의 full30 release는 새 roster 추가와 다르며 partyPower와 overkill 포함 damage를 DPS로 치환하지 않았다. v5 PATTERNS/balance-template/brainstorm-variant 전체를 이 범위에 적용했고 v5 초기5분 목표·1000ms tick을 v7 계약에 덮어쓰지 않았다.
- 근거 `e2e#/limitations`: 정식 전체2-critic.md SHA20ee0ff48a6e664b7923d4ab70f58a3228e69df77f21f00d424b42110a3b1617 및 template36f575225f0b68296c1ef2c389e650382637b9ccc33f9331542b1659fc8b5e9b를 읽었다. 실제 Designer 응답77b177df256e58432a872e3feec6d9e72cde6e0258de138b5c628f0cbeabce55는 prompt priorReports/audit history와 동일하다. 사람 관찰과 운영 서버는 이 Native/measure 결과의 확인 범위 밖이다.

**제안에 대한 반론과 판단**

- **Designer choice: 기존 목표·동료 관리 안내의 사람 관찰**
  반례: baseline은8→12h 전원 진행해도60/100에 새영웅이 없고100/100에 새포획종이 없다. 안내를 완벽히 이해해도 기존 명단을 유지하며 편히 방치하려는 사람에게 새수집이 생기는 것은 아니다. 즉시 수락보다10분 방문군의 h70 자격이 빨랐으므로 언제 환생할지의 실제 tradeoff도 남는다.
  판단: 후속 조사 우선안으로 타당하나 재미 개선의 입증은 아니다. 이해도와 별도로 관리 없이 기다릴 선택·업무 중단 횟수·다시 보고 싶은 이유를 관측하고, 완료 validation을 이용한 수치 재조정은 하지 않는다.
- **희귀 세 번째 카드 선택 설명 조사 및 자격·제시·획득 구분**
  반례: 900개 모두h70 선택0은 실제선호가 아니라첫standard 슬롯 정책의 필연적 결과다. 별도 fixture의실제 h70 세 번째 클릭은 기능을 보여도 자연 발견·선택 이유를 검증하지 않는다.
  판단: 세 단계 구분 조사에는 동의한다. 선택0을 사람의 기피율로 인용하거나 설명 추가가 자연 레어 획득을 늘렸다고 주장하지 않는다. 다른 선택 정책 연구는 향후 별도 사전등록으로 분리한다.
- **등록 마지막 자격p50을 장기 성장 경험의 대표 지표로 사용**
  반례: 전체100 중50도달이면 lower p50=40596초는 도달자의최대이며 조건부 p50=20933.6초와크게 다르다. 도달이한개만적은 가상반례에서는 동일한성공자시간대여도 전체p50가null이다.
  판단: 등록 통계 계산에는 오류가 없다. 하지만 대부분이8–12h에 보상을 획득한다는 설명은 부정확하다. 50미도달·선택0·조건부분포를 함께 유지한다.
- **동료 환생 전후 힘을 이해하면 유의미한 선택인지 평가 가능**
  반례: 실제 Lv11힘11→Lv1힘2를 이해한 사람도 당장의전투력 손해를 감수할 이유가 없을 수 있다. 훈련+consume과 reroll+reincarnate 측정은 방문주기·지출까지달라 환생 단독의이득을 입증하지 않는다.
  판단: 정확한 preview/확인/취소는 기능적 성과다. 이해도와 선택 가치·회복 기대를 구분하고 Lv1/별+1 계약을 유지한 채 사람의 선택·취소 이유를 조사한다.
- **비방해형 다음 목표 진행 표시 실험**
  반례: 18회 메뉴 방문은 합성 일정이며 실제 사람이 작업을 중단한 횟수가 아니다. 후기 목표를 더 눈에 띄게 보여도 새획득 공백은 유지되고 주의전환만 늘 수 있다.
  판단: 강제 시간 제한·자동 포커스·잦은 알림 없이 기존 목표를 재사용하는 후속 가설로만 둔다. 업무 방해 예산은 사람 관찰 전PENDING이다.
- **Designer의 두 minor 관측/재미 사항을 최종 결과의 잔여 문제로 제시**
  반례: D070-ENDPOINT-READINESS-SAMPLING과 D070-LATE-COLLECTION-GAP의 수치는 직접 재현했다. 그러나 최종 서버 capture와 동일SHA 정적 매핑은 Lv11+/목록/지정 상대의 운영 호환 문제도 남아 있음을 보여 준다.
  판단: 기존 두 minor를 보존하고 의미를 축소하지 않는다. 운영 계약은 별도의 major로 명시해 로컬 기능·모델 분석 완료와 출시 확인을 구분한다. helper의일반적인 Compared every 문구도 전체35방문 로그로 인용하지 않는다.

### balance · /root/balance

최종 0.7의 현재 S84e911f/Ec27f893과 동결 분석·900 raw를 다시 결박하고 첫 7사건/h70 분포를 9정책에서 독립 재계산했다. 기준 active 100개의 첫 수락 전체 p50 2736.6초·90분 내 100/100, h70 자격 전체 lower p50 40596초는 등록 구간 안이다. h70 도달50/미도달50·조건부 p50 20933.6초·실제 선택0과 후기 수집 공백은 유지된다. 기존 C070-LIVE-SERVER-CONTRACT major와 D070-LATE-COLLECTION-GAP/D070-ENDPOINT-READINESS-SAMPLING minor 두 건은 미해결이다. 새 고유 finding은 없으며 기존 ID를 중복 등록하지 않는다. 분석 결과이며 humanChecks/humanFun=PENDING, 운영 출시=PENDING이다.

- **bug / 확신 high**: 실제 격리 Native 원본의 고레벨 저장/재시작, Lv11→1·별0→1·힘11→2, 도감 획득/ACK 및 영웅+5동료 목록·지정 상대 진단을 확인했다. 운영 compatibility는 live=PENDING이며 health 보고 커밋의 Lv10 상한·목록 부재·지정 ID 무시를 로컬 Git 소스로 직접 확인해 기존 major를 유지한다.
  미확인: 운영 인증 API·DB·고레벨 왕복은 실행하지 않았다. health 보고 SHA의 정적 소스 반례이며 실제 배포 바이너리 attestation은 아니다.; PNG198개는 해시를 재검증했으며 이번 Balance 턴에서 198개 화면을 모두 시각 판독한 것은 아니다. smoke/package/955 gates도 재실행하지 않았다.; 별도 보존 조사에서179개 현재 존재·173개 최초 전체 바이트 연결·6개 원본 위치 미확인이다. 이를 테스트 삭제/skip/약화로 단정하지 않으며 이 감사에서 원본 복구나 그 6개의 의미 검토를 대체하지 않는다.
- **logic / 확신 high**: 정책별100개의 완료720분/seed1–100을 유지해 총900 raw와 보고서 객체·manifest·원장9900개가 일치했다. 미도달을 뒤에 두는 floor((N−1)q) 전체 분위수와 성공자 조건부를 분리하며 두 목표 분모는 즉시 수락 active/free/uniform/none/0의100개다. 콘텐츠 자격·제시·획득과 Native 최초 준비 표본을 서로 치환하지 않았다.
  미확인: h70 전체 lower p50는 도달50개의 최댓값이며 대부분이12시간 내 획득한다는 보장이 아니다. 전체 p90/최대는 미도달로 null이다.; 900은 9개 정책의 각100개이지 같은 기준 정책의900개 독립 seed가 아니다. 선택된 탐색20개나 과거0.6 검증을 합치거나 현재 결과를 튜닝에 사용하지 않았다.; Native 종료 준비상태를 최초 준비 미도달로 읽지 않는다. record는 첫 관측이며 모든 공격/포획 RNG의 연속 trace가 아니다.
- **fun / 확신 medium**: v5 패턴의 즉시 반응·작업 중 성장·발견·작은 선택을 적용하면 처치/환생 지속과 새 수집은 다른 성과다. 기준8→12h 전원 추가처치·환생에도 새 영웅 없는60/100·새 처치종 없는78/100·새 포획종 없는100/100이 남는다. 기존 안내의 사람 관찰은 후속 가설이며 반복 보상의 가치나 업무 방해 해결을 입증하지 않는다.
  미확인: 사람 관찰이 없으므로 humanChecks/humanFun=PENDING. 합성 입력량·18회 예정 방문을 사람 참여율이나 업무 중단 횟수로 표현하지 않는다.; 희귀 선택0은 첫 standard 슬롯 정책이며 사람의 기피율이 아니다. fixture 세 번째 h70 클릭은 자연 획득·선호를 증명하지 않는다.; 훈련/미끼/재굴림은 동료 관리·방문 주기와 결합돼 있다. 골드 지출 단독 인과효과·항상 우월한 최적 전략·유료 필수 경로를 주장하지 않는다.

- 근거 `measure#/runs`: release SHA46271facabdeb917748b50b46b2136246c0fd65281b5e76b350a7dcd1e6b1079; raw900 literal SHA·binding·각 run JSON SHA 및 embedded 객체 동일성을 직접 재검사했다. 동결 release-v070-analysis 16파일(FROZEN63a3724e…, final116b4a84…)·source/eval/build 압축3개·manifest·실행/완료로그·readiness6개 owned/current hash도 일치했다. 기존 내 Python 재검산 e5f5bfca…는9900 checkpoint/297분포를 보존한다. 이번엔 첫7/h70의90분포와9900 금원장을 다시 계산했다.
- 근거 `measure#/settings/baseline`: 기준 active/free/uniform/none/0. 모든 정책 fresh 초기상태와 validation1–100/720분을 별도 유지했다. actual command는 node .harness/v7/loop/measure.mjs run <R>/evidence/release.json --phase release --suite --candidate candidate-r8-tail10450 --seed-set validation --workers 4. 이번 감사에서 재실행하지 않았다.
- 근거 `measure#/targets`: 첫 수락 전체/조건부 p10/p50/p90/최대=1698.4/2736.6/3539.5/3723.3초, 평균2665.613초;90분100/100. h70 자격 전체17441.5/40596/null/null, 조건부14841.7/20933.6/34739.3/40596초·평균24757.062초,50미도달. 전체 평균은 검열을 임의 대체해 계산하지 않는다.
- 근거 `measure#/protocol/milestones`: 현재 공식protocol52f4206c…와 report embedded가 동일하며 production21키가 동결 source/compiled parameters와 같다. discovery.ts96/100/108/115/136/142의6실제조건 및 PROGRESSION_CONTENT_RULES를 대조했다. 최종은 h70 uniqueHeroes10+totalKills30000이고, 자격은 무료·성과 기반이다.
- 근거 `measure#/method`: 현재 progression.ts의L17/XP20×1.42^(L−1), field1153/1000→index79 이후10450/10000, companion115/100을 읽었다. formulas.ts의BigInt 단일 floor와 monster boss5, hero.ts120–126의L+max(0,L−2)^2·영혼/환생, engine.ts238–269의동일1draw/영구할당quota5/depth63/roster30 release, hero.ts225–256·measure.mjs285의첫standard 선택을 확인했다. 새 수치 제안이나 실행은 없다.
- 근거 `measure#/runs/0/records`: 기존 내 동결 policy01의 동일seed8→12h·2h/12h 경계 포함100ms 정수 gap을 사용했다. 추가킬p50=17231/최소386,환생p50=80/최소2,partyPower 동일68. seen 최대공백p50/p90/최대=9158.5/25518.1/31089.4초, 신규획득=11364.3/31954.9/34294.8초. 이후 처치가 계속되므로 발견 공백을 전투 정지로 부르지 않는다.
- 근거 `measure#/runs/600/policy`: 훈련+consume/600초의h70자격100/100·전체p5016807초·지출p5028875·최대동료Lv p5067, 미끼+fuse/600초92/100·22227초·62050, 재굴림+reincarnate/120초100/100·9969초·728000. 무료600초도89/100·25894.3초다. 패키지 효과이며 단독 구매 효과가 아니다.
- 근거 `e2e#/matrix/originals`: matrix45af28ccfa167f889b415ca187c5d9cf2d8179ef4d1cea5a5bf1c91785263c5c의10개 원본 SHA·동일S/E·430 true checks/errors0와198 PNG SHA를 직접 재검사했다.9개 실제5/15/30분×3프로필+별도180분이며 자연 합19803022.837542ms. post-natural fixture는 자연 성과에 포함하지 않는다.
- 근거 `e2e#/sessions/9`: 180분18회 예정 메뉴방문/14선택, firstReady2312052.202208ms와firstReincarnation2401183.300416ms 및종료13077킬/동료30/영웅14를 원본에서 읽었다. 한 실제 Native 경로와 100seed 모델 분포를 합쳐 목표로 집계하지 않는다.
- 근거 `e2e#/sessions/6`: 30-active 종료Lv17/76킬/1493골드지만 firstReadyElapsedMs=null을 직접 확인했다. electron-e2e.cjs229의final flush는 recordFirstReadiness에 들어가지 않는다. 기존D070-ENDPOINT-READINESS-SAMPLING minor 유지: 준비 미도달과 최초시각 미확인을 구분한다.
- 근거 `e2e#/checks/416/details`: h70 세 번째 실제 클릭 진단은 fixture=true/naturalAcquisition=false다.409–415의선택/처치 기반 도감·알림/ACK,418의Lv11/250/MAX_SAFE saved=resumed,421의Lv11힘11→Lv1별1힘2,424–429의영웅+5동료50행·지정ID/키보드/포커스를 원본 값으로 읽었다. 자연 희귀선택0 또는 사람 이해도를 덮지 않는다.
- 근거 `e2e#/checks/423/details`: 격리 서버 진단 성공과 운영 호환을 분리한다. 실제 compatibility.json9eeb9ad2…/local로그c29c1fc3… 해시를 확인했으며 live=PENDING. 보고된Git28270992518dc5bfc9c1f89f700c0491eaf8d1ed의api.ts104 LEVEL_MAX10, app.ts128/203–215의고레벨400,358–394의opponentId미사용,458–480의directory부재를 직접 읽었다. 기존C070-LIVE-SERVER-CONTRACT major를 유지하고 호환운영SHA/새고레벨근거 전 출시는 보류한다. 이 pointer는 운영 API 실행 증거가 아니다.
- 근거 `e2e#/limitations`: 전체3-balance.md1728행/101085bytes SHA5042057459b6350a9a33466d8051e67ea9c4c57a84875549796ec43df4ce747d, template30a9d8778b0fd5f73f1c3419baddeedaf31e1ad894c7f9e9ca8e17bfe69be49d와장르3문서를 전부 읽었다. actual Designer77b177df…/Critic67cf9154…는 prompt priorReports 전체와 동일했다. v5의5분/1000ms초기 가설을 v7목표/100ms에 덮어쓰지 않았다. 별도 보존 amendment0e0f65ba…의173/179와6미확인을 출시판정으로 바꾸지 않는다.

**실측 수치의 해석과 한계**

- **첫 7사건과 기준 환생 분포**: 기준100의 첫 처치·보상 p50 각4.5초, 레벨업15.5, 포획50.5, 준비/제시/수락 각2736.6. 포획p10/p90/최대=35.5/192.5/2783초;첫수락1698.4/2736.6/3539.5/3723.3초·평균2665.613초.90분내100/100·미도달0.
  한계: 등록 목표는 평균이 아니라전체p502700–3600초와90분90/100이다. 즉시방문이므로 세 시각이 같으며 Native 메뉴의 실제대기까지없다는 뜻이 아니다.
  근거: `measure#/runs`
- **마지막 h70 자격·제시·실제 선택**: 자격50/100(8h전30,8–12h20),제시50,실제선택0.자격전체p10/p50/p90/최대17441.5/40596/null/null초;조건부14841.7/20933.6/34739.3/40596초.제시전체p5040692.5초/조건부21271.6초.
  한계: 전체 lower p50는50번째 관측치로 도달자최대다. 미도달50의시간·전체평균을추정하지않는다. 등록28800–43200초구간 안이어도대부분의희귀획득/선택을보장하지않는다.
  근거: `measure#/targets`
- **6 named 성과의 무료 경로**: 기준자격/제시/획득수: crownwyrm100/100/100,rootcolossus100/100/100,h58100/98/0,h6281/80/0,starvoid67/67/67,h7050/50/0.몬스터획득은처치이며실제포획은왕관용21/뿌리거인22/별먹이0이다.
  한계: 몬스터처치·동료추가·영웅선택을분리한다. 첫슬롯정책은희귀영웅을고르지않으며 유효자격만으로도감소유를주지않는다. paid-only조건은없다.
  근거: `measure#/protocol/milestones`
- **9정책 전체분포와 미도달 분모**: 정책순서는 baseline즉시무료,무료600,간헐무료600,warm-idle무료600,pure-idle무료600,burst즉시무료,훈련+consume600,미끼+fuse600,재굴림+reincarnate120이다.각100개 첫수락전체p50초=2736.6/3000/4800/13800/null/1822.6/2400/3000/2040;90분내=100/100/64/13/0/100/100/100/100;첫미도달=0/0/0/30/100/0/0/0/0. h70전체p50초=40596/25894.3/28810.5/null/null/25651.5/16807/22227/9969;미도달=50/11/19/56/100/32/0/8/0;제시=50/89/78/43/0/67/100/92/100;선택은전정책0이다.
  한계: 대안8개에기준목표를강제하거나100×9를단일분모로합치지않는다. 조건부h70p50=20933.6/24710.4/27112.2/30067.4/null/17327/16807/21646.7/9969초로별도보존했다.
  근거: `measure#/runs`
- **작업 입력과 순수/초기활동 방치**: 동일12h active균일과burst는각86400입력이나첫p50는2736.6 vs1822.6초다.간헐21780입력은4800초/90분64개;warm-idle240입력은첫수락70개·h70자격44개.입력0/동료0 pure-idle는처치/수락/자격0이다.
  한계: 초기활동으로얻은동료와새게임순수방치를혼동하지않는다. burst는피버/공격순서/RNG소비시점도달라입력총량만으로인과를설명하지않는다. 실제사용자의타이핑속도표본이아니다.
  근거: `measure#/method`
- **후기 처치·환생과 수집 공백**: 기준동일seed8→12h 추가킬p10/p50/p90/최대1128/17231/35078/66904·최소386,추가환생5/80/120/120·최소2;전원계속진행.그중새영웅0=60,새처치종0=78,새포획종0=100,파티기본힘동일68.2–12h새획득최대공백p50=11364.3초/worst34294.8초.
  한계: 기존D070-LATE-COLLECTION-GAP minor 유지. 경계포함고유kind/id gap이며금/중복방출같은모든보상의간격이나무처치시간이아니다. 안내조사만으로새수집을늘렸다고결론내리지않는다.
  근거: `measure#/runs/0/records`
- **전투 정체의 긴 꼬리**: 12h각run 최장무처치시간을100개에서정렬한p50/p90/최대초는기준752.5/968/1823.8,간헐1165.1/3363.5/3895.5,warm4837.4/43081/43085,pure43200/43200/43200이다.
  한계: 최장구간의분포이며평균TTK가아니다. 무관리로스터30/Lv1을레벨상한재발로해석하지않는다. 모든포획RNG/깊이연속기록은없어개별정체원인을전부확정하지않는다.
  근거: `measure#/runs`
- **전투 공식과 동료 환생의 당장 손익**: 영웅비치명L+max(0,L−2)^2는Lv10=74/Lv17=242이며영혼·영웅환생·훈련을곱한뒤치명/피버가적용된다.동료힘=max(1,floor(companionHP/20))×Lv×2^별이므로환생직후힘비는2/Lv다.현재필드tail은동료HP115/100공식을바꾸지않는다.
  한계: 누적heroDamage/companionDamage는overkill포함emitted bigint,partyPower는선택파티기본힘으로DPS나실제HP감소와같지않다. Lv11→1의11→2감소를장기성장보장이나즉시강화로설명하지않는다.
  근거: `measure#/method`
- **골드 원장과 소비의 관측 효용**: 9900checkpoint에서초기금+income−spent=coins일치.기준12h지출0·금p501563085;훈련정책은전100개훈련10/지출28875,최대동료Lv p5067.미끼+fuse지출p5062050,재굴림+reincarnate728000.무료600초에서도h70자격89개로필수지출경로가아니다.
  한계: 서로다른표본의income/spent각각p50를빼서coins p50라고하지않는다.지출+관리+메뉴빈도묶음의효과라단독구매효과가아니다.회복시간은현재수입률고정가정없이는추정하지않으며수입0은도달불가이지0분이아니다.
  근거: `measure#/runs`
- **환생을 빨리 선택하는 전략의 한계**: 기준즉시수락은h70자격50개/전체p5040596초인데같은무료균일입력의600초방문군은89개/25894.3초다.기준최종환생p50137과600초군67은더많은환생이항상더빠른named조건달성을뜻하지않음을보인다.
  한계: 정책전체를비교한결과이며개별seed항상우위/인간최적전략을주장하지않는다.등록된현재값이나선택기준을완료validation으로재조정하지않는다.
  근거: `measure#/runs/100/policy`

### playtester · /root

Host 겸 Playtester로 실제 10개 Native 관측·자연 330분3.023초·430개 참인 검사와 별도 900개 정책별12시간 원본을 검토했다. 전체 prompt/template과 세 실제 역할 응답을 읽고 원본·직접 본 화면·독립 계산으로 대조했다. 기준 첫 성공p50 45.61분/90분100 of100과 h70 자격전체p50 11시간16분36초를 확인했지만 h70 미도달50/선택0을 유지한다. C070 운영 서버 major와 D070 두 minor는 미해결이며 기술 승인·운영 출시는 보류한다. 분석 완료와 출시 검증은 다른 상태이고 humanChecks=PENDING이다.

- **bug / 확신 high**: 격리 실제 Electron에서 고레벨11/250/MAX_SAFE 저장·재시작, Lv11힘11→Lv1별1힘2 확인, 레거시 도감/단일알림/ACK/목표,50행 영웅·5동료·실제 지정상대·키보드와포커스를 확인했다. Host가 실제 smoke/패키지/DMG를 별도 실행했어도 운영 서버의 구버전 계약을 해소하지 못하므로 C070 major를 유지한다.
  미확인: 운영 register/upload/PvP/회수·실DB는 실행하지 않았다. health 보고SHA의 정적 소스 반례이며 실제 운영바이너리 attestation이 아니다.; 합성 입력과 모의 네트워크로 수행했다. 실제 OS 글로벌 입력 권한·알림·사람의 작업 복귀 경험은 PENDING이다.; 최초179 경로는 모두존재하나6개 변경테스트의 최초 전체바이트 위치가 미확인이다. 별도보존증거의 한계이며 본 audit pair로 사용자 변경 전체의 복구가능성을 인증하지 않는다.
- **logic / 확신 high**: 미도달을 뒤에 두는 등록floor((N−1)q) 전체분포를 유지했다. 기준100개 첫성공과h70자격/제시/실제획득을 분리했고9정책×100을단일분모로합치지않았다. 긴Native18방문14선택과주기준비관측을 실제원본/PNG로 연결했으며30-active 종료READY와firstReady=null의표본한계를 유지한다.
  미확인: h70은50도달/50미도달이므로 전체lower p50=40596초가도달자의최댓값이다. 대부분이12시간에획득한다는의미가아니다.; Native준비/선택시각은관측시각이다.30-active의정확최초준비시각은미확인이고비동기최종save를정확한엔진사건시간으로바꾸지않는다.; 후기포획RNG와전체명단의연속깊이trace는없다.누적overkill피해나partyPower를DPS로치환하지않는다.
- **fun / 확신 medium**: 장르의 Ambient→Surprise→Interaction→Reward→Collection에서전투반응·반복환생은지속되지만새수집공백은길다. Designer의안내이해도조사를후속우선안으로유지하되Critic이제시한관리거부/업무중단/환생시점의반례를포함해야한다. Balance의정책차이는복합행동결과이며더많은환생이나골드지출이항상더좋다는결론을내리지않는다.
  미확인: 사람관찰이없으므로재미·취향·강화손실이해·업무방해의효과는PENDING이다.; 희귀선택0은첫standard슬롯정책이므로사람의기피율이아니다.진단에서세번째카드를눌렀다는사실도자연획득이나선호를증명하지않는다.; 안내추가가콘텐츠소진을해결한다는보장은없다.현재검증결과를이용해등록수치·조건·정책을자동최적화하지않는다.

- 근거 `e2e#/matrix/originals`: 실제matrix45af28cc…의10원본·로그·198PNG를Host의 native-final-host-check.json b4a1a47c…에서 독립재해시했다.430checks모두true/errors0이며모든짧은종료9개와긴종료1개를직접봤다.실제순차실행종료를확인한기록이며하네스준비/0분진단을자연관측으로대체하지않는다.
- 근거 `e2e#/observationMs`: 자연합19803022.837542ms=330분3.023초.9개5/15/30분×3프로필뒤별도연속180분이며fixture진단은각자연관측뒤였다.실행중빌드·시간가속·개인save는사용하지않았다.
- 근거 `e2e#/sessions/9`: 실제10분마다18회메뉴,14개서로다른영웅선택/환생14.모든18메뉴PNG를실시간직접보고 sessions/native-long-host-observations.jsonl a549d898…에해시/상태를기록했다.최대완료지연1267.079333ms,첫준비2312052.202208ms≤첫선택완료2401183.300416ms.종료Lv1/13077킬/동료30/영웅14이며h70총30000킬에는미달한다.60분선택후PNG는이미Lv2이고180분메뉴gold3462763→후속endpoint3462764는순차표본이다.
- 근거 `e2e#/sessions/6`: 직접본30-active 종료Lv17/REBIRTH READY와실제firstReadyElapsedMs=null을함께보존했다.마지막Lv16표본과최종flush사이정확준비시각은미확인이다.D070-ENDPOINT-READINESS-SAMPLING을미도달이나수정완료로표현하지않는다.
- 근거 `e2e#/checks/416/details`: 이번최종검토에서도실제180분원본의rare-third-offer/acquired PNG를직접봤다.원본은fixture=true/naturalAcquisition=false,세번째h70 실제heroChoose/serial41 단1회→Lv1/환생11/영구컬렉션·heroCounts·history,단일알림/ACK·목표완료.미선택둘은실루엣이다.이원본을900개 시뮬레이션의 희귀 선택0의대체근거로쓰지않는다.
- 근거 `e2e#/checks/418/details`: Lv11/250/9007199254740991 expected=saved=resumed를직접읽었다.별도Native진단의신뢰경계왕복이며MAX초과를허용하는계약이아니다.
- 근거 `e2e#/checks/421/details`: 180분후속진단PNG를이번에직접보아Slime Lv11→1/별0→1/힘11→2/감소안내/확인·취소를대조했다.420취소무변경,422 Bat Lv250→251변경뒤확인무효화도원본에서읽었다.현재collection.ts consume/fuse/reincarnate의변경전안전정수검사와expected snapshot대조를직접확인했다.
- 근거 `e2e#/checks/428/details`: 실제Enter e2e-103,Space e2e-101,mouse e2e-7에대해요청opponentId=응답playerId=DOM선택/포커스가같다.424–426의50고유행/영웅+5동료/실제trustedkeyboard/행재사용과함께읽었다.직접본selected-list PNG는E2E_Foe49의선택강조와5파티를보여주며다른시점ID클릭으로오인하지않는다.
- 근거 `e2e#/checks/427/details`: 51번째높은순위상대때문에e2e-7이목록에서빠진후refresh포커스,selected0/previewParty0/battleDisabled=true를원본과이번에직접본fallback PNG로대조했다.계정삭제나운영서버변경을실행한것은아니다.
- 근거 `e2e#/checks/409/details`: 409–415의레거시획득집합/반복부팅/알림·ACK·목표원본을읽었고실제first-kill-codex PNG에서Bat 1회처치공개와나머지실루엣을다시봤다.collection.ts222–234의ACK가acquired와교집합인것을확인했다.
- 근거 `measure#/targets`: 실제release46271fac…와Host 독립900재집계 v2 fc4d9dd5…/Balance교차검산3fe09117…이일치한다.기준첫전체p50=2736.6초/90분100 of100, h70전체p50=40596초/50도달50미도달·조건부20933.6초.보조v1의조건부p90 8개계산차이는원본을보존하고등록floor방식으로교정했으며중앙값/전체목표/제품/실제측정은변하지않았다.
- 근거 `measure#/runs`: 9정책각validation1–100×720분900원본을새로실행했다.이전0.6/탐색10001–10020과분리했다.독립Balance 동결16파일과raw/실행archive결박을확인했고정책별빠름/지연/미도달을유지했다.기준8→12h전원추가킬/환생에도신규영웅없는60·신규처치종없는78·신규포획종없는100이다.D070-LATE-COLLECTION-GAP은미해결이다.
- 근거 `measure#/protocol/milestones`: 동결21개수치와6콘텐츠ID/성과조건이실제생산코드와같다.h70은actualuniqueHeroes10+totalKills30000.현재engine.ts238–269의index63이상보스/명단30미만/영구할당1–5와1RNG draw를직접읽었으며필드HP와동료힘HP115/100을혼동하지않았다.
- 근거 `e2e#/checks/423/details`: 이성공은격리서버진단이다.Host가최종별도capture9eeb9ad2…를실제로실행해로컬121테스트/빌드0와livePENDING/CLI1을확인했고등록server AC도1이었다.독립35파일매핑b003e618…는보고된운영Git28270992518dc5bfc9c1f89f700c0491eaf8d1ed에서13일치/17불일치/5없음을보였다.C070-LIVE-SERVER-CONTRACT major를유지한다.이pointer를인증운영API호출증거로쓰지않으며helper .every의첫불일치중단을전체35검사로과장하지않는다.
- 근거 `e2e#/limitations`: 전체4-playtester.md 1907행/119436bytes SHA99c9e23b84ae691c8e8a42cf57d88ac4ff2dcdc0890cde8fc5998a14d4931f05와실제template60e7baaeed8873d8d866d4d5c05252edfd98a15250a7ee9bfbe4f080d190d47b,지정v5 genre3문서를모두읽었다.실제D77b177df/C67cf9154/B728800f9응답FULL을읽고순서대로submit/next했다.별도Host smoke/actualpackage10/DMG5/955gates성공은각원본로그에있고이Nativepair의출시승인으로합치지않는다.

## 다음 업데이트 우선순위

### 1. 운영 고레벨·지정 상대 호환 근거 확보

가설: 현재검증한서버계약이운영빌드와정확히대응하면새클라이언트의Lv11이상과상대목록/지정선택을운영호환근거로검증할수있다.

측정: 보고된운영SHA와검증된35파일대응, 고레벨11/250/MAX_SAFE 왕복·잘못된응답거절, 새등록server AC 및새감사의미해결major수.

통과 조건: 별도로승인된운영작업후새불변근거와등록server AC성공을확인한다.필요한소스/평가기변경시영향받은검증을새로실행하고현재major/실패원본을고치거나삭제하지않는다.이번결과는PENDING이며배포를실행하지않는다.

비용/범위: 운영변경의별도승인과실제배포대응검증이필요하다.현재로컬제품수치는변경하지않는다.

근거 발견: C070-LIVE-SERVER-CONTRACT

### 2. 기존 목표와 선택적 동료 관리의 사람 관찰

가설: 기존도감목표·희귀세번째선택·환생힘감소를이해하는지와관리없이계속기다리고싶은지를분리하면안내부족과수집소진을구분할수있다.

측정: 자격/제시/획득구분정확도, 환생확인전힘감소인식, 선택·취소이유, 새획득공백중다시보고싶은이유, 업무중단횟수.

통과 조건: 후속조사 전에참가자수·관측절차·판정값을사전등록하고실제사람의응답/행동을기록한다.현재5명중4명이해안은Designer의후속가설이며실행한AC가아니다.합성18회방문·선택0을사람행동으로바꾸지않고현재validation으로수치를재조정하지않는다.

비용/범위: 새기능을만들기전기존UI를이용한소규모사람관찰.자동포커스·강제시간제한·반복알림추가없음.

근거 발견: D070-LATE-COLLECTION-GAP

### 3. 종료 준비상태와 최초 준비시각의 관측 구분 보강

가설: 향후관측에서종료상태준비여부를주기최초표본과함께명시하면READY이지만firstReady=null인결과를미도달로오독하지않을수있다.

측정: endpointReady·첫관측시각·실제선택완료시각의구분, 비동기save/end표본경계, 기존null원본보존.

통과 조건: 현재D070표본한계를문서에그대로유지한다.후속평가기변경은먼저등록하고새경계검사와새실제관측으로검증한다.현재원본의null을뒤늦게수정하거나마지막save시각을정확최초사건시각으로인증하지않는다.

비용/범위: 현재는보고서의한계설명.평가기구현변경은별도후속범위이며새지문에필요한관측을다시수행해야한다.

근거 발견: D070-ENDPOINT-READINESS-SAMPLING

PENDING: 실제 참가자의 재미·선택 선호·환생 힘 감소 이해·업무 방해·OS 권한/알림을 관찰하지 않았다. 합성 입력과 격리 진단은 사람 확인의 대체가 아니다.

게임을 수정한 뒤에는 E2E와 측정을 다시 실행하고 새 분석 세션으로 전후 결과를 비교합니다.
