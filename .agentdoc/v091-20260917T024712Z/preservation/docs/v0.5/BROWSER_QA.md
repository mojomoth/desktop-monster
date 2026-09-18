# v0.5 브라우저·픽셀 QA

2026-09-10 KST, root가 Playwright로 프로덕션 메뉴/스프라이트를 검증했다. 로컬HTTP만 사용하고 실제 Electron/운영서버/사용자저장을 연결하지 않았다.

재현: `node .harness/v5/loop/render-preview.mjs`, 저장소 루트에서 `python3 -m http.server 8765 --bind 127.0.0.1`, `/docs/v0.5/menu-preview.html` 및 `rare-gallery.html` 열기.

- 실제 메뉴 크기420×640와 확대780×800에서 영웅/상점/도감/내기록/대전 패널의 가로 넘침0.
- 메뉴 도감 실카드70/135개. 조건을 충족한 미발견 일반 영웅도 단색/이름숨김, 설명·능력치 잠금. 조건/현재 진행은 무료로 보인다.
- 초기검사 fixture 1800골드에서75골드 훈련 클릭: 잔액1725, 훈련1. 가격/효과가 업데이트됐다. 실제 reducer를 쓴다.
- 이름 Editing_Name 편집 중5초 tick을 보내도 입력이 유지됐다. 이름 저장/다시 그리기, 내기록 최근순 표시를 확인했다.
- 도감 카드details 열기, 영웅/몬스터 전환,5초 갱신 후 art/node/열림 보존은 tests/menu.test.ts에서도 검증한다.
- 현재 fixture는4회 환생/검사3회+창술사1회로 만든 합성 데이터. 최근4개와영웅별 전체횟수,중첩2→3 후보 미리보기가 실제메뉴에표시된다.
- 신규50종 접촉시트: 영웅20/몬스터30 canvas모두 실제 코드 프레임.1500px폭에서 잘림/가로넘침0.
- 실루엣 전환 뒤 모든50개 canvas의불투명픽셀 RGB 집합 크기=1. 색에 따른 가짜실루엣이아니다.
- 이미지들을 직접 검토했다. 레어몬스터30종의몸통/뿔/날개/다리 형태가다르고,영웅20종은기존14px비율에서장비/머리/무기를달리한다. 주관적호감/인지도는사람검증대상이다.
- 브라우저의유일한콘솔오류는로컬서버favicon.ico404. 기능JavaScript오류는관측하지않았다.

그림: menu-420.png, menu-hero.png, menu-shop.png, menu-profile.png, menu-codex.png, rare-gallery.png, rare-silhouettes.png.

범위: 클릭/화면/픽셀자동검사. 실OS입력/권한/포커스/소리/창오버레이, 패키지실행과실제재미는 PENDING.
