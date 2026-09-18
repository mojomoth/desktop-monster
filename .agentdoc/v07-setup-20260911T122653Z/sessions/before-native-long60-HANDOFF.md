# v0.7 개발 인계

진행 갱신(2026-09-12T22:47:24Z): **실제5/15/30분×3프로필9개가모두완료**됐으며각43항목PASS/오류0이다. 실제자연관측합계는9001630.680792ms(150분이상)이고 Host가9개종료PNG를직접열고원본/PNG해시를재검산했다(`evidence/native-short-nine-host-check.json`,SHA0ef5bb0c8eb9bb79c9aed0144230552289dfab7e247ede9e7fa377f3c31d2e59). **별도연속180-active는실행중**이다: 시작22:47:24.144Z,PID/PGID94057,exec37331,원본`evidence/native/180-active-1789253244141.json`.10–180분실제메뉴18회방문이남아있으며330분완료로기록하지않는다. 재개시`matrix-state.json`의현재running과실제PGID를확인하고중복시작하지않는다. 소스S84e911f9/평가기Ec27f8937현재일치를다시확인했다.

30active종료는Lv17/76킬/동료6이며자연PNG에REBIRTH READY가보인다. 마지막주기표본은Lv16이어서firstReadyElapsedMs=null이다. 이를미준비로해석하지않으며정확한시각은미확인이다. 독립Critic보고서`final-v070-native-readiness-sampling-critic.md` SHAabf20e18...에비동기저장/표본한계와장기메뉴의선택전준비관측연결을보존했다. 짧은9개에서환생선택은하지않았다. **분석완료·설계검토완료와제품출시검증은별도**이며정식audit.mjs,남은180분,smoke,package,최종서버호환은미완료다. 운영의옛계약문제와humanChecks=PENDING을유지한다.

진행 갱신(2026-09-12T21:15:42Z): 실제 Native의5분·15분×3프로필6개가각43항목PASS/오류0으로완료됐다. 완료자연시간은60분이며 총330분은아직미완료다. 현재30-active(PID/PGID96266)가같은exec37331에서순차실행중이다. 재개시숫자를신뢰해재시작하지말고 `evidence/native/matrix-state.json`의현재running과실제PGID부터확인한다. Host는완료6개의실제자연종료PNG를직접열어상태와대조했다.

Release900의별도Balance분석도완료·동결됐다: `evidence/release-v070-analysis/README.md` SHA2dc21e65...,final-analysis116b4a84...,FROZEN63a3724e...; Host가전체README를읽고16파일해시를확인했다. 정책별과속·지연·미도달을분리하며모든정책의h70실제선택0을유지한다. 보조Host분위수검산의조건부p90방식차이8개는원본444072f1...를보존하고등록floor((N-1)*p)로900개를새로계산한v2 fc4d9dd5...로교정했다. 별도Balance교차검산3fe09117...에서288개분위수·108개표본수·9개90분수가일치했다. 전체분포·중앙값·기준목표는변하지않았고제품/실제측정을변경하지않았다. 정식audit.mjs·나머지Native·smoke·package·최종서버호환AC는별도미완료다.

현재 **release / H07-01 historical verified / V07-01–06 final0.7 verified / V07-07 running**이다. 실행 폴더는 `.agentdoc/v07-setup-20260911T122653Z`이며 실제 `develop.mjs phase ... release`와 V07-07 시작을 완료했다. Package/lock0.7.0을 먼저 고정한 뒤 최종 S84e911f9/Ec27f8937의 실제 네 역할 설계 검토, 작업별 등록 AC 및 각955테스트·lint·typecheck를 새로 통과했다. 불변 `sessions/V07-01-final-v070.md`부터 `V07-06-final-v070.md`까지 확인한다.

최종0.7의 새100seed×12시간 측정은 2026-09-12T18:56:43Z에 완료됐다. `candidate-final-v070.json` SHA30ceb515...의 첫 환생 성공 전체p50=2736.6초(45.61분),90분 내100/100으로 목표PASS다. 최종h70 자격 전체p50=40596초(11시간16분36초)도PASS다. 정확히50도달/50미도달이며 전체중앙값은 미도달을 뒤에 둔 index49다. 조건부p50=20933.6초,제시50/100,실제선택0/100을 구분한다. 전체p90/최악은null이며 성공자만으로 바꾸지 않는다. 실제 별도 Balance분석b83f6571.../FROZEN91b995db...와 Host77994480... 검산이 일치했다. 이전0.6 결과의 재사용·검증값 기반 수치조정은 없다.

**새 release900 측정은 완료**됐다. 실제 실행은2026-09-12T19:00:33.515843Z–20:10:10.684924Z이며 exec59844/PID10481·10487은 종료했다. 9개 등록정책 각각seed1–100×12시간으로 원본900개를 새로 실행했다. `evidence/release.json` SHA46271facabdeb917748b50b46b2136246c0fd65281b5e76b350a7dcd1e6b1079, 실행기록SHAe6b466626375c0638046230a7ef694c98d7e8aa54fa7183d880e17df94d30dbf를 보존했다. 실제 measure/structural-verify 및 등록V07-07 measure AC가0으로 종료했다. 기준active 목표는 위 최종100seed와 같은45.61분·100/100·h70자격11시간16분36초로PASS다. 다른정책의 목표통과를 뜻하지 않는다. 사전동결 분석기b2d42993...로 별도Balance가 완료원본을 분석 중이다.

최종0.7 실제 Electron의 별도0분 preflight와 등록 integration은 각각42항목PASS다. Host/Designer가 실제 PNG와 원본을 대조했다. h70 세 번째 클릭/serial41→선택이력·도감·단일알림·ACK, Lv11 환생확정과힘11→2, Lv250대상변경 확인취소,11/250/MAX저장·로컬네트워크, PvP50행영웅/5동료·지정ID·실제키보드·포커스가 확인됐다. Lv250실제환생 확정이나 자연h70획득을 뜻하지 않는다. 두0분진단은 자연관측에 합산하지 않는다.

**실제 Native330분 관측을 시작했다.** 실행명령은 `/usr/bin/caffeinate -di node .harness/v7/loop/e2e-matrix.mjs run .agentdoc/v07-setup-20260911T122653Z/evidence/native`, exec37331이다. 첫5-active가2026-09-12T20:12:22.699Z에 PID/PGID25835로 시작했다. 현재실행은 `evidence/native/matrix-state.json`의 running과실제PGID를 확인하며 중복시작하지 않는다. 5/15/30분×3프로필9개 뒤 별도연속180분active가10분마다실제메뉴를 방문한다. 자연관측 중fixture/시간가속/동시빌드는 없으며 후속진단은 자연관측 뒤 별도다. 아직 전체330분은 완료되지 않았다. 완료 후 별도 네 역할audit.mjs,smoke,실제package,최종서버호환AC를 실행한다. 런치근거SHA29a8a420...에완료release/소스·평가기/현재설계검토/정책별seed/프로세스확인을 연결했다. **humanChecks=PENDING, 제품출시검증=PENDING**이다.

운영서버는 단1회읽기health GET에서SHA28270992518dc5bfc9c1f89f700c0491eaf8d1ed를 보고했다. 로컬에존재하는그커밋의소스를 별도Critic이검토한결과 동료Lv10상한,목록route부재,지정상대ID무시·영웅응답부재가 확인됐다(`evidence/server-readonly-preflight/deployed-contract-static.md`,SHAf64d11f2...). 실제인증API/DB시험이나전체35파일대응검증으로확대하지않는다. 운영호환은입증되지않았으며 클라이언트출시검증을완료처리하지않는다. 자동배포하지않고 남은로컬검증을계속한다.

첫 동결의 트레이 버전 불일치954PASS/1FAIL, 실제Critic반려→원본보존→제품한줄수정→refresh와 새PASS를 보존했다. 실행wrapper의설계/소유파일지문누락도 독립검토 후 실행전에 원본과수정을 보존했다. 기존 사용자변경·save·v5·CURRENT=v3을 보존하며 커밋·푸시·운영배포하지 않았다. 하네스준비·설계검토완료·개별분석완료·제품출시검증은 별도상태다.

이하 Round08 채택과 최종 재검증 준비의 이전 기록이다. 현재 상태는 위와 실행 loop.json을 따른다.

현재 **candidate / H07-01 historical verified / V07-01 running / V07-02–07 pending**이다. Round08 채택안 `candidate-r8-tail10450`의 별도0.6.0 검증을 마쳤고 V05를 verified로 기록한 뒤 V06을 시작했다. 2026-09-12T17:55:25Z에 package/lock을 **0.7.0으로 먼저 고정**했고, 최종 소스 재검증을 위해 실제 V01 invalidate/start를 수행했다. 이전 성공은 불변 이력으로 보존한다.

Round08은 8개 실험·11개 보고서·220개 원본과 소스/평가기/빌드 아카이브를 완료했다. 세 후보의 첫 환생 전체 p50은2878.7초(47.98분),90분 내20/20 성공이다. 최종h70 자격 전체p50은10450=36991.5초,10425=31768.5초로 두 안이 통과했고10400=24451초는 너무 빨라 실패했다. 등록된 선택 순위는10450→10425다. 10450의 h70 자격10/20·미도달10/20·실제선택0을 유지하며, 조건부p5028693.9초를 전체판정으로 대체하지 않는다.

실제 독립Balance 분석은 `evidence/round08-analysis/final-analysis.json` SHA6f1b022b...로 동결됐고 Host 별도 검산SHA25333b89...와 일치한다. 2026-09-12T17:38:53Z에 계약17에 원본을 보존한 후 공식프로토콜을 validation/selected10450으로 고정했다(원본SHA1a0fec2a..., 채택SHA52f4206c...). 수치21개·여섯 콘텐츠·목표·분모·seed구분은 변경하지 않았다. 새 검증1–100 실행 전 채택이며, 과거 실패 `evidence/candidate.json`은 불변이다.

채택된 생산 소스에서 실제 build, V05 progression48/harness142, 정확한955테스트+lint+typecheck가 새로 통과했다. `evidence/round08-adopted-checks`에 실행 로그를 보존했다. 새 검증 출력은 `evidence/candidate-round08.json`, 실행 아카이브는 `evidence/validation-round08-v060`, 실행기는 `sessions/round08-validation.py`다. 새100seed 측정은2026-09-12T17:48:20Z에 완료됐다(exec73584/Python8867 종료). report SHAe7b607b2..., 실행SHAecca14ae...를 보존했다. 첫환생 전체p50=2736.6초·90분100/100, h70자격 전체p50=40596초로 세목표PASS다. h70자격/제시50/100·미도달50·실제선택0,조건부p5020933.6초를 별도로 유지한다. Host 독립검산95367816...과 Balance 최종분석60b24d28.../README4848d5a0...가 일치하며 모든 원본·아카이브 무결성 검산을 완료·동결했다. 등록measurementAC도 새로 통과했다. 측정/Native가 없고 사용자Electron50718/PGID50646이 유지되는 것을 시작 전에 확인했다.

이전 `reviews/design-round08`의 실제 Designer→Critic→Balance→Host 검토와 V01–04 검증은 control-l17 소스 S5b839be7/E2c357339에서의 불변 이력이다. 채택 후 프로토콜과 소스가 달라져 현재의 최종 승인으로 재사용하지 않는다. 원본 계약18을 보존하고 새 `reviews/design-final-v070` 및 `evidence/candidate-final-v070.json` AC 경로를 등록했다. 최종 희귀 세 번째 카드 UI 선택 진단의 누락을 발견해 자연 관측 이후 별도fixture진단으로 보강 중이다. Designer는 DESIGN과journey.cjs, Host는필수check등록·누락거부테스트·공통계약을 소유하며 Critic은 읽기만 한다. 같은 최종 소스의 모든 영향받은 AC·게이트·실제측정을 새로 수행한다.

최종 입력 동결 첫 시도의 protocol/harness143은 통과했지만 정확한 게이트는 트레이 제목0.6.0과 package0.7.0 불일치로954PASS/1FAIL이다. `V07-01-1789236199356.log` SHA09a6ebc5...를 보존했고 lint/typecheck는 실행되지 않았다. 실제 Designer001 제안과 Critic002의 major반려(C070-VERSION-FREEZE-GATE)를 기록했고 계약19에 원본을 보존한 뒤 제품의 트레이 문자열만0.7.0으로 수정했다. 기존 테스트는 유지했다. 실제 `fun.mjs refresh`로 round2/S84e911f9/Ec27f8937 검토를 연결했다. 이 수정 소스의 protocol/harness143/955테스트+lint+typecheck는 새 실행에서 모두PASS다. 실제 Designer→Critic→Balance→Host 검토가 진행 중이며 최종 측정/Native는 아직 미실행이다. 이 동결 시도를 최종 성공으로 인증하지 않는다.

0.7.0 버전 고정은 완료했으며 최종 소스 재검증, 실제 Native330분,9정책×100seed×12시간,별도 네 역할 audit.mjs 감사,smoke·실제패키지·운영 고레벨 서버 호환은 **PENDING**이다. 사람 관찰이 없어 **humanChecks=PENDING**이다. 기존 save·미커밋 변경·v5·CURRENT=v3을 보존하며 커밋·푸시·운영 배포는 수행하지 않았다. 하네스 준비·설계 검토·탐색 분석 완료·제품 출시 검증은 별도 상태다.

- **Round06 실제수정과다음실행:** contracts/candidate-13/14가등록전원본을보존한다. V02는큰전송ID/로컬중복/overflow 발급을기존ID·명단무손실로거부하고,외부s/r와안전소진표지를유지한다. Critic이찾은positiveInfinity재무장은실제회귀1FAIL/32PASS뒤수정했으며새149AC/943gates와독립리뷰PASS;원본infinity-followup로그보존. V05는count1/5의영구할당구간과full30무보장/기존35%추첨/1draw를구현했고955gatesPASS이나성능미확인이다. sessions/round06-batch.py는실제종료했으며모든선별FAIL·12h미실행이다. 원본경로evidence/exploration/round-06은불변으로보존하고재시작하지않는다. 새같은후보screen/full기록을짝짓고이전XP141prefix동일성을요구하지않는다. 새별도검증AC는candidate-round06.json이다. 기존candidate.json은덮어쓰지않는다.
- **round05 탐색 완료·이후 검증실패:**10425/10450/10475 per10000, s79/Lv17/XP1.41. 모든20seed 첫p50=2902.6초·90분18/20·첫prefix20/20PASS. h70전체p50=26357.4/29903.5/37946초,10425과속FAIL·뒤둘PASS. 등록tuple에서10475의10h거리1946초가10450의6096.5초보다가까워10475를채택했다. 10475 h70자격11/20·미도달9/20·실제선택0·조건부p5025215.9초를분리한다. 독립분석JSON SHAe4aec630... 및 Host검산SHAd6f174...; 원본/실패/중간스냅샷은불변이다. batch5580/Python73278은종료됐다.
- **검증 실패 근거:**100seed원본무결성PASS·목표FAIL. 독립분석JSON SHA44ad1514... 및README3de4cb2a..., 실제등록measurement AC V07-05-1789194386876.log(exit1, SHA040395a9...). `sessions/V07-05-round05-validation-failed.md`는실패세션이며V05 verified가아니다. Round05 설계·단위검증과100seed실패/최종출시를별개로기록한다. 앞으로새검증AC출력은새경로를등록하며candidate.json을덮어쓰지않는다.
- **Native 준비관측 수정 적용:** R05-NATIVE-FIRST-READY-OBSERVATION의5파일 초안을 원본/소유권등록(contractcandidate12) 후적용했다. 30초표본·방문전·선택직전 실제준비관측을최초값으로보존하고 matrix는누락/첫선택후준비를거부한다. 의미있는경계회귀포함harness138PASS이며 실제최종Native순서관측은아직PENDING이다. `evidence/native-readiness-repair/repair.json` 참조. V06에 packaging.test.ts와README.md 소유권도등록했다. README초안은Designer가준비했지만아직적용하지않았다.
- **프로토콜/이력:** contracts/candidate-12는원본config/loop/protocol/Native5파일을보존하고Host단독계약동기화및채택을기록한다. 당시채택프로토콜SHA44d3a06...는candidate-13에보존했다. 설계round05와V01–04verified는이전S049ffeb/E2fffd6근거이며최종0.7.0에서낡은설계/영향AC를새경로로재검증한다. 단계승급·출시완료는하지않았다.
- **round04 완료:** exec session95160/Python26341은 종료됐다. 8개 실제생산/11보고서/220raw를 모두 완료했고94생산테스트와구조검증PASS다. 세후보 첫p50=2902.6초·90분18/20·prefix20/20PASS지만 h70전체p50=24101.5/23121.7/20968.5초(1040/1035/1030)로전부너무빠른FAIL이다. 자격17/20,20/20,20/20과실제선택각0을분리한다. 개별seed단조성도깨져 시간보간으로채택하지않는다. 후보검증seed미사용/채택없음. 마지막프로세스확인에서Native/measure없고사용자Electron50718/PGID50646유지. 원본및독립round04-analysis보존.
- **round03 완료:** 8개 실제생산안 모두94개생산테스트/구조검증PASS. 세tail모두 firstp50=2902.6초·18/20by90min·20/20첫기록일치지만12h최종목표FAIL이다. tail105 h70자격5/20(2개8h전),전체p50null이며 성공자조건부37073초를 목표PASS로 쓰지 않는다.12h킬p509226,paired8→12h추가킬p504504,모든20개가8h이후다시선택했다. 희귀영웅실제선택0은첫카드정책과관련되며 전투정체와구분한다. 모든220raw/11보고서 독립무결성PASS. Native/측정종료;채택/검증seed사용없음.

- **round03 검증 이력:** round03 정식 설계는 실제 Designer `/root/designer` → Critic `/root/critic` → Balance `/root/balance` → Host Playtester `/root` 순서로 모두 PASS다. `reviews/design-round03`는 불변이다. V01 protocol·harness132·design와 V02–04 등록 AC 및 각 canonical916/lint/typecheck를 source9c391f/evaluation2e858a에서 새로 실행했다. 불변 `sessions/V07-01-round03.md`부터 `V07-04-round03.md`에 verified 근거가 있다. 이후 tail 구현으로 바뀌는 소스의 최종 근거는 별도로 만든다.
- **이전 round03 사전등록:** control-l16–20과 candidate-r3-tail111/108/105. 후보는 모두 Lv17·XP1.41·필드 HP index79까지115/100, 이후111/108/105 per100이며 BigInt 마지막 나눗셈 한 번으로 계산한다. 동료 힘의 HP 기준은115/100이다. 여섯 기존 콘텐츠 조건과 최종h70(실제 서로 다른 영웅10종 선택·총30,000킬), 목표/분모/seed/기존휴식은 유지한다. selectedExperiment=null; 아직 채택·검증seed 사용 없음.
- round03 V05 구현 당시 파일 담당: Balance는 formulas.ts/formulas.test.ts/progressionV7.test.ts, Host는 renderer 큰 수 fixture·progression.ts 생산 수치·실행저널이다. 원본은 `evidence/exploration/round-03/pre-tail-implementation`에 보존했다. Critic은 읽기 전용 감사다. 이후 구현과 테스트, 실제8변형 탐색을 완료했다. 첫 여정20seed 참조는 `round-03/prefix-reference.json`으로 사전 고정했으며 사건 시각·기록된 콘텐츠 사건·첫 선택을 비교한다. 원본에 없는 전체 공격/처치 trace까지 비교했다고 주장하지 않는다.
- **round02 결과:** 모든8안과 XP141의 실제12시간을 완료했다. XP141 첫환생 p50=2902.6초,90분18/20으로 선별PASS지만12시간 h70자격0/20으로FAIL이다. 총킬p50=977,서로 다른 영웅선택p50=8,8→12시간 추가킬p50=8이다. XP142는3361.5초·11/20,XP143은4935.5초·12/20으로 선별FAIL. 채택안없음. `evidence/round02-analysis/final-analysis.json`에 독립180raw/9보고서/8실행 무결성 및 전체·조건부 분위수를 보존했다. 원본source tar의4tsconfig는 Users/... 접두 경로가 있어 재현시 명시한 매핑을 사용한다; 원본은 바꾸지 않는다.
- **round01 결과:** 대조L16–20/A/B/C 모두 탐색20seed120분 선별FAIL,12시간승급0,장기목표NOT_EVALUATED. 전체160raw와 독립분석은 round-01 및 round01-analysis에 남아 있다. B의 최초87pass/1fail은HP114의 실제 처치시점 차이였고 원본을 보존한 뒤 공격순서·지연경계·정확피해/HP 검증을 강화했다. scheduler는 그대로다.
- **구현 기능:** 동료 안전정수 상한제거·overflow무손실·전후환생힘확인, 저장/서버/모든응답 검증, 실제획득 도감·레거시ACK, PvP50행·영웅과5인파티·지정ID·선택/포커스/만료/오류, 실제engine 공유 자격selector가 구현되어 있다. 새 소스 최종 검증과 운영 호환은 별도다.
- **실제 Native 진단:** 0.6.0 preflight attempt01은36항목PASS 뒤 Enter입력 오류로FAIL. char 이벤트 보완 후 attempt02는41항목PASS,15PNG. 원본/실패/수정근거를 모두 보존했다. 선택목록PNG는재정렬전compositor프레임일수있으므로 재정렬 완료는JSON근거로만 설명한다. 0분fixture진단이며 최종0.7.0 자연관측330분을 대체하지 않는다.
- **보존:** 기존 앱/builder 메타데이터는 `preservation/pre-v07-package`에307개파일해시와110070702바이트 압축으로 먼저 보존했다. 기존DMG는 그대로다. smoke/package 실행 근거가 아니다. 이전 HANDOFF 진행 기록은 `sessions/handoff-before-round03-tail.original.txt`에도 보존했다.

이전 재개 절차 기록(현재상태는상단): 당시제품/lock0.6.0에서 V05탐색·채택·100seed검증 후 V06버전고정을 예정했으며, 이 순서는 위와 같이 실제수행했다. 영향 AC/설계/측정의 최종 재검증은 계속진행한다. 최종0.7.0 Native330분·release9정책100seed12h·audit.mjs 네역할·smoke/package·운영고레벨호환은 미실행이다. 사람 관찰이 없어 **humanChecks=PENDING**이다. 하네스준비·설계검토·분석완료·제품출시검증은 별도 상태다. 커밋·푸시·운영배포는 수행하지 않았다.

## 이전 setup 인계 기록

아래는 setup 완료 당시 기록이다. candidate 승급과 V07-01 시작은 위 현재 상태처럼 이미 수행했다.


이번 인계 범위는 v7 하네스 준비와 현재 v0.6 기준선 측정이다. **게임 v0.7 기능은 아직 구현하지 않았다.** 앱은 0.6.0, 기존 `.harness/CURRENT`는 v3이며, 기존 npm 명령과 제품 소스를 유지한다.

실행 폴더는 `.agentdoc/v07-setup-20260911T122653Z/`다. 최종 완료 판정과 검증 수치는 [실행 결과](../../.agentdoc/v07-setup-20260911T122653Z/evidence/setup-result.md), 작업별 상태와 등록 AC 로그는 [loop.json](../../.agentdoc/v07-setup-20260911T122653Z/loop.json)을 기준으로 한다. 기준선의 목표 미달은 하네스 준비 실패나 v0.7 성공으로 해석하지 않는다.

## 측정과 보존 근거

- [기준선 원시 결과·요약 JSON](../../.agentdoc/v07-setup-20260911T122653Z/evidence/baseline.json): seed 1–100, 각 12시간, 실제 엔진에 RNG·시계·입력을 주입한 시뮬레이션이다. 실제 Electron 1,200시간 또는 사람의 플레이 시간이 아니다.
- [측정 조건과 지문](../../.agentdoc/v07-setup-20260911T122653Z/evidence/baseline-execution.json): 명령, 소스·평가 도구·컴파일 결과를 연결한다. seed별 원본은 같은 폴더의 `baseline.json.runs/`에 보관한다.
- [시작 상태](../../.agentdoc/v07-setup-20260911T122653Z/baseline/metadata.json): 제품 소스 지문은 `c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef`다. `baseline/files.json`의 기존 파일 179개를 시작/종료에 비교한다.
- 재현용 제품 소스는 `baseline/product-source.tar.gz`, 평가기는 `baseline/harness-inputs.tar.gz`에 있다. 개인 세이브·인증 파일은 포함하지 않는다. 측정기 수정 전에 중단한 attempt01/02도 별도 보관한다.
- 기존 v0.6 데모 스크립트 4개에서 발견한 lint 오류 64개는 Node import와 동작을 유지하는 문법 정리로 수정했다. 원본은 `baseline/preexisting-demo-scripts.tar.gz`, 변경·검증 근거는 [수정 기록](../../.agentdoc/v07-setup-20260911T122653Z/reviews/preexisting-lint-repair.md)에 있다. 제품·v5·ESLint 규칙은 변경하지 않았다.

## 다음 세션

[START_PROMPT.md](START_PROMPT.md)를 사용한다. 실행·재개 명령은 [LOOP.md](LOOP.md), 제품 계약과 작업표는 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md), 후속 검증표는 [ACCEPTANCE.md](ACCEPTANCE.md)에 있다. Host가 Playtester를 겸임하고 Designer·Critic·Balance를 각각 별도 에이전트로 실행한다.

H07-01이 verified인지 확인한 뒤, 소스나 프로토콜을 수정하기 **전에** 아래 명령으로 candidate 단계에 들어간다. 이어 V07-01에서 구체적인 콘텐츠 ID와 후보 수치를 등록하고 네 역할 설계 검토를 실행한다.

```sh
node .harness/v7/loop/develop.mjs status .agentdoc/v07-setup-20260911T122653Z
node .harness/v7/loop/develop.mjs phase .agentdoc/v07-setup-20260911T122653Z candidate
node .harness/v7/loop/develop.mjs next .agentdoc/v07-setup-20260911T122653Z
```

V07-01–07은 모두 후속 작업이다. 이번 구성에서는 실제 Electron 장시간 플레이, smoke, 패키징, 운영 서버 변경을 실행하지 않는다. 관련 검증 도구와 AC를 준비했으며 최종 v0.7 소스에서 실행해야 한다. 사람의 재미·업무 방해 검증은 **PENDING**이다.
