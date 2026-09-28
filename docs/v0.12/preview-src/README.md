# v0.12 실제 코드 기반 화면 프리뷰

열기: [play-screen-preview.html](../play-screen-preview.html)

현재 `createGame().draw()`·스프라이트·HUD·폰트·메뉴 CSS를 직접 번들한 화면 검토용 프리뷰다.
인게임 캔버스는 200×130, 표시 크기는 400×260이며 메뉴는 560×640이다.
사냥 화면은 합성 저장 데이터로 현재 게임을 렌더링한다. 실제 사용자 저장 파일은 읽거나 쓰지 않는다.
레이드 영웅은 기존 14×14 원화를 scale 1로 그린다. 보스는 64×44 원화를 scale 2로 그려,
실제 게임 창에서 보스 한 도트가 4×4px, 영웅 한 도트가 2×2px다.
8·20·32·50명 비교를 제공하고 기본 화면은 32명이다. 보스 앞 중앙을 포함한 필드 전체에
배치하고, 인원이 많으면 최대 5개의 얕은 줄로 겹쳐 그린다. 내 영웅·노란 표식은 맨 앞 중앙에
그린다. 테스트에서는 100명까지 범위를 확인한다.
메뉴 정원 50명과 참여 32명은 화면 확인용 예시이며 서버 설정 변경은 아니다.

보스는 던파 [공식 안톤 던전 소개](https://df.nexon.com/pr/actupdate/MDAwNTk/?cat=3)의
[흡수의 에게느 인게임 이미지](https://bbscdn.df.nexon.com/data6/editor_img/201406/DV7RZ91053a95026b3c15/1403605030_933W1W53a95026b3ffa.jpg)를
직접 확인한 뒤, 넓은 어깨·지면을 짚는 굵은 팔·작은 얼굴의 비율을 참고해 새로 그린 갑각 거인이다.
원본 게임 이미지를 자산으로 사용하지 않는다.

다음 보스 안내는 “레이드가 열리면 참여 조건을 확인할 수 있습니다.”, 순서 표시는 “등장 순서”다.

사냥과 레이드 모두 실제 `createGame().draw()`를 호출한다. 보스는
`src/renderer/sprites/raidBosses.ts`, 배치는 `src/renderer/raidScene.ts`, 메뉴와 팝업은
`src/menu`의 공유 구현을 사용한다. `preview-src`는 합성 입력과 검토용 껍데기만 유지한다.
실제 앱 연결 여부는 별도 통합 검증 기록을 확인해야 하며, 이 프리뷰는 실서버나 저장 파일을
사용하지 않는다. 미래 보스 4종은 같은 임시 실루엣을 재사용하며, 보상은 예시다.
공식 V12-08 아트 승인 자료나 릴리스 완료 증거가 아니다.

## 다시 만들기

```sh
node docs/v0.12/preview-src/build.mjs
python3 -m http.server 41712 --bind 127.0.0.1 --directory docs/v0.12
```

브라우저에서 `http://127.0.0.1:41712/play-screen-preview.html`을 연다.
생성된 HTML은 스크립트·CSS를 내장하므로 파일로 열어도 된다.
`play-preview/sources.json`은 번들에 사용한 소스 해시를 기록한다.
`play-preview/screenshots`에는 실제 크기의 상태별 PNG와 비교 보드가 있다.
`play-preview/screenshots/integrated`는 공유 렌더러 통합 후의 캡처이며 정식 아트 승인 기록과는 별개다.
`play-preview/crowd-board.html`에서 8·20·32·50명 화면을 동시에 비교할 수 있다.
수정 전 캡처는 `play-preview/screenshots/first-pass`에 보존했다.

## 검증

- 이전 프리뷰 세션 기준 `npm test && npm run lint && npm run typecheck`: 95개 파일, 1,285개 테스트. 현재 통합 변경은 103개 파일·1,348개 테스트와 lint/typecheck를 통과했다. 실제 앱 연결 범위는 [구현·검증 기록](../IMPLEMENTATION_STATUS.md)을 따른다.
- `tests/raidPreview.test.ts` — 보스의 2배 도트·렌더링 면적·픽셀 경계·프레임·실루엣·팔레트, 게이지 간격, 1·8·20·32·50·100명 배치·겹침·내 영웅 순서·입력 범위 검증.
- Playwright Chromium — 인게임 상태별, 메뉴 6상태, 밝은 배경·공격 표시를 캡처. 메뉴 560×640에서 잘림·넘침 없음.
- 참여 완료 전환, 공격 픽셀 변경, 2배 확대, 메뉴 참여, 참전 확정, Esc, 결과 닫기, 인원 선택별 서로 다른 렌더링 확인. 렌더링 예외 없음.
- Electron 네이티브 창·전역 입력·실서버 통신 검증은 이 화면 프리뷰의 범위에 포함하지 않는다.
