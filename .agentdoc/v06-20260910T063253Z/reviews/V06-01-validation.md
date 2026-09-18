# V06-01 검증

최종 source c1b3603ed446d75fdd4830e59aac930d5fad73d17c6bef7de6c888b062914aef / evaluation d402273c4cae0e9d597a4efe3a5648ac56cc2ad4c121e5c483b71f7710797de8.
실제 `node .harness/v5/loop/fun.mjs selftest` exit0, 7파일52검사. 원본 evidence/V06-01-1789024442659.log. 정확한 저장소 게이트 exit0, 52파일776검사 및 lint/typecheck, 원본 evidence/V06-01-1789024117510.log. 실행 전후 소스·도구·소유 manifest 동일, loop.json check에 기록.

기준선 archive/해시와 protocol v2 및 실제 엔진 생성 fixture를 게임 수정 전에 고정했다. 실제 개발 실험은 experiments-development.json에 남아 있으며 최종 채택 증거로 재사용하지 않는다. matrix의 누락·중복·중첩·실시간 부족·stale 도구, 감사 원시 재계산, 살아 있는 자식 프로세스 중복 시작 방지, 저널 의존성·소유 경로·retry/invalidate/exclude 이력은 하네스 회귀에서 확인했다. 기존 단일 E2E/감사 CLI는 유지.

실제 독립 Critic이 도구의 stale 지문/제외 무효화/경로 소유권/프로세스 그룹 반례를 검토해 반영했고, Balance가 10800표본/3600궤적 원시 값과 보존/paired 결과를 독립 재계산했다. 구현 검토는 reviews/implementation-review.md와 evidence/balance-development-review.json. V06-01은 실행 지원과 프로토콜 검증이며 현재 진행 중인 최종9개 관측을 완료로 주장하지 않는다. 실제 장시간/최종 측정/4역 감사는 V06-09에서 별도 판정한다.
