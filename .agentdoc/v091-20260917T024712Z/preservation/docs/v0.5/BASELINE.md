# v0.5 입력 기준

- 작업 시작 브랜치: v3, package 0.4.0. 커밋되지 않은 V4 구현을 그대로 기반으로 사용.
- 2026-09-10: `npm test && npm run lint && npm run typecheck` 종료0; 45개 파일, 691개 테스트.
- V4 하네스 selftest8개 통과.
- `DESMON_BALANCE_REPORT=docs/v0.5/baseline-v4.json npx vitest run tests/balance.test.ts` 종료0.
- 기준 엔진100 seed ×3프로필 ×5/15/30분 =900개 원시 관측 저장.
- 입력 소스/테스트/정적 파일의 로컬 복구본과 SHA256은 `.agentdoc/v5-20260910/`에 보존.
- 신규 의존성/설치, git commit/push, 운영 배포 수행 없음.
