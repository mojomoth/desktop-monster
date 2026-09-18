# v7 검증표

진행 갱신(2026-09-13T02:07:39.604686+00:00): **최종 0.7.0 Native 관측 완료**. 5/15/30분×3프로필 9개와 별도 연속 180분 active가 모두 종료 코드 0이며, 10개 원본의 430개 검사 PASS·오류 0이다. 실제 자연 관측은 19803022.837542ms(330분 3초), PNG 198개이며 `evidence/native/matrix.json` SHA45af28ccfa167f889b415ca187c5d9cf2d8179ef4d1cea5a5bf1c91785263c5c에 집계됐다. 연속 180분은 실제 메뉴 18회·환생 14회·서로 다른 영웅 선택 14종을 기록했다. 첫 준비 관측 2312052.202208ms, 첫 선택 완료 2401183.300416ms를 구분한다. 자연 종료는 Lv1·13077회 처치·동료30·환생14다. Host가 18개 메뉴와 전체 10개 종료 PNG를 직접 확인했고 최종 독립 원본/해시 검산은 `native-final-host-check.json` SHAb4a1a47c...에 보존했다. exec37331/48165는 종료 코드 0, PGID94057과 matrix PID25832는 종료됐고 사용자 앱 PID50718은 유지됐다.

**최종 소스의 955개 테스트·lint·typecheck, smoke, 실제 package가 통과**했다. package 검사 10개 PASS·오류0, 실제 런타임0.7.0 및 레거시/목표/재시작 보존을 확인했다(`evidence/package/package.json`,SHA59bd5bbd...). `release/DesMon-0.7.0-arm64.dmg`는 110371291bytes, SHA6b1b14b3f86f507116c99872b8d1538b2cf91ba8376d952cc10498175c167cbe다. 읽기 전용 DMG checksum/metadata와 포함 앱 295파일·14링크 일치도 5검사 PASS다(`evidence/distribution/dmg.json`,SHA549de020...). 실제 설치·공증·사람 관찰로 확대하지 않는다. 이전 앱은 불변 압축에, 이전 버전 DMG 10개는 원위치에 보존했다.

**정식 결과 감사는 진행 중이고 V07-07은 미검증**이다. 별도 `audit.mjs`가 발급한 실제 Designer prompt로 검토 중이며 Critic→Balance→Host 판단이 남았다. 최종 서버 capture는 로컬121검사/빌드 PASS지만 운영 호환 PENDING으로 종료 코드1, 등록 server AC도1이다(`evidence/server/compatibility.json`,SHA9eeb9ad2...). 실제 health SHA28270992518dc5bfc9c1f89f700c0491eaf8d1ed의 전체35파일 추가 정적 대조는13일치·17불일치·5경로누락이다. 동일 SHA에 Lv10 상한·목록 route 부재·지정 상대 ID 무시가 있으며 인증 운영 API/DB 검증을 뜻하지 않는다. 하네스 준비·설계 검토·수치 분석·결과 감사·제품 출시 검증은 각각 별도 상태다. 제품 출시 검증 및 humanChecks는 PENDING이고 커밋·푸시·운영 배포를 수행하지 않았다. 최종 S84e911f9/Ec27f8937은 불변이며 문서 갱신을 이전 AC의 동일 소유 파일 지문으로 재인증하지 않는다.

진행 갱신(2026-09-13T00:49:11.976714+00:00): **별도 연속 180-active가 120분을 지나 실행 중**이다. 실제 메뉴 방문은 12회이며, 40/60/70/80/90/100/110/120분 선택으로 환생이 0→8회로 연결됐다. 최근 120분 선택은 `h41`(완료 7201152.123666ms), 화면은 Lv1·보유 영웅 8종·다음 환생 Lv21·기존 휴식 120초다. Host는 12개 실제 메뉴 PNG를 모두 직접 보고 `sessions/native-long-host-observations.jsonl`에 각 기록과 해시를 남겼다. 10/20/30/50분 방문은 준비 전이었다. 첫 준비 관측 2312052.202208ms와 첫 실제 선택 완료 2401183.300416ms를 구분한다.

짧은 9개(150분)는 완료됐지만 **연속 180분 및 전체 330분은 아직 미완료**다. 남은 실제 60분·6회 메뉴 방문을 같은 원본 `evidence/native/180-active-1789253244141.json`, PID/PGID94057, exec37331에서 계속한다. 현재 PGID와 사용자 앱 PID50718 생존, 최종 S84e911f9/Ec27f8937 불변을 다시 확인했다. exec48165는 JSON 읽기 관찰기다. 재개 시 실제 상태와 process group을 확인하고 중복 시작하지 않는다. 종료 후 정식 네 역할 audit.mjs, smoke, 실제 package, 최종 서버 호환 AC와 gates를 수행한다. 제품 출시 검증 및 humanChecks는 PENDING이다.

진행 갱신(2026-09-12T23:49:45.761860+00:00): 별도 연속 180-active가 **60분을 지나 실행 중**이다. 실제 10분 간격 메뉴 방문 6회 중 40분 `h04` 선택(환생 0→1, 완료 2401183.300416ms)과 60분 `h15` 선택(1→2, 완료 3601202.154625ms)이 성공했다. 첫 준비 관측은 2312052.202208ms이며 정확한 엔진 발생 시각과 구분한다. 10/20/30/50분 방문은 준비 전이었다. Host가 6개 실제 메뉴 PNG를 직접 보고 `sessions/native-long-host-observations.jsonl`에 전후 기록과 해시를 남겼다. 60분 선택 후 PNG는 이미 진행된 Lv2를 보여주므로 Lv1 화면으로 표현하지 않는다.

짧은 9개(150분)는 완료됐지만 **연속 180분·전체 330분 검증은 미완료**다. 현재 원본 `evidence/native/180-active-1789253244141.json`, PID/PGID94057, matrix exec37331을 유지한다. exec48165는 JSON을 읽는 stdout 관찰기일 뿐 추가 Native가 아니다. `native-process-check-long60.json` SHAfc8ecd0f229d6806fb60834ebc755a96e3416ade920b47a1a6a8e36e501fbbcc에서 Native 실행기 1개·측정 실행기 0개·사용자 앱 PID50718 생존과 최종 S84e911f9/Ec27f8937 불변을 다시 확인했다. 남은 실제 120분 이후 정식 네 역할 결과 감사, smoke, 패키지, 최종 서버 호환 AC와 gates를 계속한다. 제품 출시 검증 및 humanChecks는 PENDING이다.

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

하네스 준비, 설계 검토, 로컬 기능 검증, 측정 및 출시 검증을 구분한다. 실제 현재 상태는 loop.json과 HANDOFF.md 상단을 따른다.

하네스 준비의 최종 판정은 [실행 결과](../../.agentdoc/v07-setup-20260911T122653Z/evidence/setup-result.md)와 [loop.json](../../.agentdoc/v07-setup-20260911T122653Z/loop.json)의 H07-01에 기록한다. 아래 후속 기능은 하네스 자체 검사로 통과 처리하지 않는다.

| 대상 | 완료 근거 | 현재 단계 |
| --- | --- | --- |
| H07-01 하네스 | 자체 테스트·정확한 저장소 게이트·100 seed × 12시간 baseline·앱/기존 파일 보존 | 최종 저널 참조 |
| 동료 상한 제거 | Lv11/250/MAX_SAFE_INTEGER 저장/재시작·JSONB·업로드·목록·전투·탈취/회수, overflow 무손실; sessions/V07-02.md | 이전 로컬 AC PASS; 새 프로토콜·운영 호환 PENDING |
| 동료 환생 | Lv10 미만 거부, Lv10 이상 Lv1/별+1, 전후 힘·별도 확인·변경 대상 무효화; 동일 소스 AC/gates 통과 | 이전 로컬 AC PASS; 새 프로토콜·최종 Native PENDING |
| 도감 공개 | 후보/스폰만으로 실루엣 유지, 선택/첫 처치 직후 카드·알림·목표 동시 갱신; sessions/V07-03.md | 이전 로컬 AC PASS; 새 프로토콜·최종 Native PENDING |
| 레거시 도감 | 등장만 한 항목 비공개와 ACK 제거, 영구 컬렉션 ACK 반복 저장/재시작 보존, 과거 처치 추정 없음 | 이전 로컬 AC PASS; 새 프로토콜·최종 Native PENDING |
| PvP 목록 | 각 행 영웅·파티·승패·선택, 지정 ID 전달, 50명 스크롤/키보드 포커스·오류 처리 | 이전 candidate AC/0분 진단 PASS; 최종 소스 PENDING |
| 첫 영웅 환생 | p50 45–60분, 전체 100개 중 90개가 90분 이내 성공; ready/open/accepted 분리 | PENDING |
| 장기 콘텐츠 | 사전등록 마지막 해금 p50 8–12시간, 2시간 이후 남은 목표와 실제 선택/처치 분포 | PENDING |
| 정책 비교 | 동일 seed·입력량의 집중/균등, 골드 사용, 동료 관리, 방문 간격, 방치 정책 | PENDING |
| 실제 Native | 9개 짧은 조합 + 연속 180분 active, 격리 save, 실제 메뉴 방문·환생 선택 | PENDING |
| 출시 후보 | 최종 0.7.0 소스 게이트·네 역할 감사·smoke·실제 패키지·서버 고레벨 호환 | PENDING |
| 사람 관찰 | 실제 참가자의 선택/자발적 재확인/업무 방해 기록 | PENDING |

목표 미달도 baseline 결과로 보존한다. 미도달 seed를 0초로 바꾸거나 도달한 표본만으로 분모를 줄이지 않는다. 그래프·수치·합성 입력 관측을 사람의 재미 검증으로 표현하지 않는다.

현재 preflight attempt01은0분 진단으로36개 항목 통과 뒤 첫 Enter 지정 상대 응답 대기에서 실패했다. 도감/레거시·고레벨 저장/응답·환생 확인/취소/변경 무효화·50행 표시의 실제 실행 근거는 있으나 전체 Native와 최종 소스 검증은 PENDING이다. 원본은 `.agentdoc/v07-setup-20260911T122653Z/evidence/preflight/attempt01`에 유지한다.

후속 attempt02는 입력 이벤트 보완 후41개 진단 모두 통과했다. 이 결과는0.6.0 candidate의0분 fixture 진단이며 최종0.7.0 자연 관측을 대체하지 않는다. V07-04의 최신 등록 근거는 sessions/V07-04.md이며 round01 탐색 실행은 evidence/exploration/round-01에 별도로 보존한다.

Round01 전체 160개 원본의 독립 해시 감사는 통과했지만 채택 가능한 안은 없었다. Round02의 Lv17·XP1.41 후보는 탐색 20개에서 첫 환생 p50 2902.6초, 90분 안에 18/20 성공으로 선별을 통과했다. 같은 탐색 seed의 실제 12시간 측정에서는 h70 자격 충족 0/20으로 장기 목표에 실패했다. XP1.42는 첫 성공 p50 3361.5초·90분 성공 11/20, XP1.43은 4935.5초·12/20으로 선별에 실패했다. 이번 라운드의 채택안은 없다. 검증 seed 1–100을 사용하거나 목표를 완료 처리하지 않았다. 최신 상태와 다음 행동은 HANDOFF.md 및 loop.json을 따른다.
