# Critic — 머리 위 LV/READY 외곽선

**최종 PASS. 차단 결함(P0/P1) 없음.** 이 세션 보존본과 현재 제품·테스트 diff 및 `counter-ui.mjs` 보강을 읽고 Designer 최종 판단 이후 실제 증거를 수락했다. 제품·테스트·저널 수정이나 테스트 재실행은 하지 않았다.

- 제품 변경은 `src/renderer/hud.ts:92`, `:95`의 두 `drawText` 호출을 기존 `drawOutlinedText`로 바꾸는 것이다. scale 1, 기존 흰색 LV/노란 READY, 중심점·Y, `heroReady` 조건과 XP 바 코드는 그대로다. 배경 패널을 추가하지 않았다.
- 현재 fixture 기준 LV 잉크 y79–83/외곽선 y78–84, READY 잉크 y72–76/외곽선 y71–77이며 XP 바 y86 앞의 y85가 비어 있다. 글자 크기나 위치를 움직이지 않는다.
- 수정 테스트는 기존 잉크 픽셀의 정확한 비교를 유지하면서 별도의 1px 외곽선·배경 부재·XP 앞 공백을 검사한다. 레벨 미달·보류 중 READY 부재, XP·우상단 카운터·상태 보존 검사도 유지했다. `tests/renderer.test.ts`는 보존본과 동일하다.
- 보강된 실제 앱 evaluator는 원본 font glyph로 잉크 좌표를 만들고 네 방향 1px 확장 집합을 독립 계산해 실제 frame의 색·외곽선·주변 투명을 비교한다. 기존 카운터 10조합과 필수 5개 체크를 유지했다.

검토 제품 SHA-256: `d49a8e4f777b25228231cc3f4b758d6883cce2b476f69eca9f95e8ead2dc9855` (`src/renderer/hud.ts`).

실제 `native/counter-ui.json`은 5개 체크/10조합 PASS·exit 0이며, LV/READY 모두 잉크·외곽선 불일치와 예상 밖 alpha가 0이다. XP 앞·상단·좌우 공백 alpha도 0이다. 현재 소스 208개·증거 8개·실행 앱 ASAR를 독립 재해시해 불일치가 없었다. 앱 SHA는 `b3cefe6b97a9d330b9a39d204577d33558905de400dd051f2de9450e646dea1a`다.

`gates.json`과 해시 일치한 로그에서 exact gates 73개 파일/1,071개 테스트·lint·typecheck PASS를 확인했다. 전후 digest는 `095e2831c5db0e8a324c40b1c8f9293ef55f58b6fec8abfe5916d9ef6ae20aa5`로 같다. `field-light.png`를 직접 열어 라벨 외곽선·기존 위치·XP 간격을 확인했고, `reviews/designer.md`의 밝고 어두운 실제 이미지 최종 PASS도 읽었다. 추가 수정은 필요하지 않으며 기존 외부 출시 PENDING은 이 UI 검토로 완료 처리하지 않는다.
