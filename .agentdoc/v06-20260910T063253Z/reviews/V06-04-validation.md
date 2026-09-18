# V06-04 구현 검증

기존 도감 상단의 명시 확인·무료 목표 선택/변경/해제, 실루엣과 적격/발견/보유 구분. Native5초 focus/open/scroll 유지, 실제 저장실패 화면내 aria-live·재시도, renderer재시작 상태보존. 동일goal phase조건재미달/발견완료는 명시 fixture로 검증하며 자연획득이 아님. Designer·Critic이 지적한 두 Native 근거 공백을 quick-05에서 보완.

source c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef
evaluation 53fc0326a4ad1a742b775f3bdf887a072de0927e1d811af3431e116663d9e080

실제 관련AC 8파일157tests exit0: evidence/final-ac-04.log. 정확한 게이트 776tests/lint/typecheck exit0: evidence/final-gates-04-record.json의 원본 로그. 시작 freeze.taskFiles와 현재 각 소유 manifest가 동일함을 재검사하여 이 실제 통합 게이트를 공유했다. quick-05.json 37/37 Native 진단은 현재 동일 지문이며 최종9개 관측을 대신하지 않는다. 기존 실패와 옛 소스 진단은 loop 이력/원본 로그에 보존. 독립 사전 검토는 reviews/designer-final-preflight.md, critic-final-preflight.md; 최종4역 감사와9관측은 V06-09에서 별도 판정.
