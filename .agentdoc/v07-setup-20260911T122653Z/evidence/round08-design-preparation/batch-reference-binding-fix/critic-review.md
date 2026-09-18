# Critic 읽기 재검토 — 참조 binding

실제 `/root/critic`가 보존 원본과 수정된 `sessions/round08-batch.py`의 차이 및 `finding.json`을 읽었다. 앞서 발견한 준비 prefixes의 원본 연결 누락은 **정적 검토 범위에서 해결**됐다.

- 공식 `protocol.recordedFirstJourneyComparison`의 path/SHA와 준비 참조를 먼저 대조하고 실제 원본 파일 SHA도 확인한다.
- 해당 원본의 experiment ID와 정확한 탐색 seed10001–10020을 검사한 뒤 기존 `prefix()`로 기대값20개를 다시 만든다.
- 준비 prefixes가 재계산값과 같은지 확인하고, 실제 후보 비교에는 준비값 대신 재계산한 `reference_prefixes`를 사용한다. 준비 내용만 변경해 원본 비교를 통과시키던 틈이 닫혔다.
- 변경은 위 연결과 기대값 선택에 국한된다. 기존7첫사건·첫 선택/120분 검열, R07 참조 비교와 같은 후보 screen/full 비교의 구분은 유지된다.

원본 SHA-256: `e98b8908ae999a1ae3180a842038d09158208ec913bc77bace577ce94d83087b`  
수정 batch SHA-256: `0fae96a8d0c3073e158a1afc1fc1cee97faaa73b1ba2481bbecc97739a484e76`

추가 잔여 결함을 찾지 못했다. 이 검토에서 batch·테스트·빌드·측정을 실행하지 않았고 후보 결과/검증 seed1–100을 읽지 않았다. 향후 실제 실행 성공이나 정식 fun/audit 판단을 대신하지 않으며, 이 문서 외 파일은 수정하지 않았다.
