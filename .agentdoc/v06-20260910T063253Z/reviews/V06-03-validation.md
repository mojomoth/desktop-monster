# V06-03 구현 검증

미확인 ID/단일 goal 저장, 실제 seen 집합에만 ack 합침, 선확인/중복/stale/잘못된 종류 방어. 구세이브 이관과 금전·동료·영웅·기록 보존. Critic 구현, Designer/호스트 검토. Native 실제 heroOffer 새발견 뒤 이전 snapshot ack두번과 디스크 미확인 보존을 검증. 전역 선언 누락은 수정하여 최종 gate 통과.

source c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef
evaluation 53fc0326a4ad1a742b775f3bdf887a072de0927e1d811af3431e116663d9e080

실제 관련AC 8파일157tests exit0: evidence/final-ac-04.log. 정확한 게이트 776tests/lint/typecheck exit0: evidence/final-gates-04-record.json의 원본 로그. 시작 freeze.taskFiles와 현재 각 소유 manifest가 동일함을 재검사하여 이 실제 통합 게이트를 공유했다. quick-05.json 37/37 Native 진단은 현재 동일 지문이며 최종9개 관측을 대신하지 않는다. 기존 실패와 옛 소스 진단은 loop 이력/원본 로그에 보존. 독립 사전 검토는 reviews/designer-final-preflight.md, critic-final-preflight.md; 최종4역 감사와9관측은 V06-09에서 별도 판정.
