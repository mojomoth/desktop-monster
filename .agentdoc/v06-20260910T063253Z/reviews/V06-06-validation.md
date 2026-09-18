# V06-06 최종 실험 검증과 조건부 제외

실제 최종0.6.0 source c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef, evaluation53fc0326a4ad1a742b775f3bdf887a072de0927e1d811af3431e116663d9e080. 사전고정 protocol v2 SHA9e7a8d4575098c34d860080fca7a0a57f8c3edc3fadf5816b53348d28727e632. baseline fixture 실제 bytes도 AC에서 해시일치 확인.

experiments.json actual exit0, 576.390초, 포획3600궤적/10800체크포인트·fever200궤적·신규idle300체크포인트. measure.json actual exit0, 93.358초, 100seed/18그룹/1800체크포인트. Balance 실제 별도에이전트가 raw를 재계산하여 capture10800행/최종1200짝·canonical558지표분포·재화보존 확인. 원본/독립검토: evidence/experiments.json, measure.json, balance-final-review.json. 결과 문서 docs/v0.6/EXPERIMENT_RESULTS.md.

AC: `node .agentdoc/v06-20260910T063253Z/evidence/validate-final-measurements.mjs` exit0. 정확한 게이트 `npm test && npm run lint && npm run typecheck` exit0, 776tests. 최신 성공 기록 final-experiment-ac-02-record.json / final-gates-06-02-record.json. 최초 증거helper의Node URL/console import누락 lint실패는 원본로그와-before.txt로 보존하고 명시import로만 수정했다. 앱/평가도구/프로토콜 지문은 불변.

같은600초방문30분에서 pending과existing-management-only의 seed별5속성 power/loss/click 조건을 사후완화 없이 비교. fresh stage1은 속성악화32·손실증가26·클릭증가100/100, full stage1은45/37/100, full stage2는40/25/100. fresh stage2는보류기회와개선0. 따라서numericCriteriaPass=false, decision=excluded. V06-07/08의미구현을조건부제외로기록한다. pending의제품저장/중복정산/업로드검사를통과했다고주장하지않는다. 현재production방출규칙과가격/피버수치/포획률은유지.

동일3600입력의폭주피버처치차중앙+25지만10/100seed에서감소. 훈련정책처치차중앙+31이지만부족1791가상초와초기골드를포함한minimumBalance=0의한계를함께기록. 순수신규idle0진행은대조군이며warm-idle봇과다르다. 실제사람의재미/업무방해는PENDING. 실제9개Native와4역감사·패키지는V06-09/10에서별도검증.
