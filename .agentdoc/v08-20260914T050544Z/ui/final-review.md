# v0.8 최종 UI 검토

판정: 승인한 UI 범위 통과. 현재 픽셀 분위기와 420×640 크기를 유지한 외부 테스트 후보로 받아들일 수 있다. 이 검토는 Steam 출시 품질이나 사람의 재미를 판정하지 않는다.

- 실행 대상: 실제 DMG를 읽기 전용으로 마운트해 복사한 `../install/attempt02/DesMon.app`.
- app.asar SHA-256: `7f4a217d0bc49255003721841ccc965a01daf4fcd5100e94a4f464ef72455472`.
- 근거: [최종 UI 검사](attempt-02/ui-report.json), [격리 실행 진단](attempt-02/runtime.json), [원본 로그](attempt-02/runtime.log). 검사 16/16 통과, PNG 10장 직접 확인, 실행 종료 코드 0.

| 확인 항목 | 실제 결과 |
| --- | --- |
| 기본 환생 화면 | [420×640 화면](attempt-02/hero-three-choices.png)에서 세 후보와 선택 버튼이 모두 보인다. 세 번째 버튼 하단은 509px. Lv.1/첫 몬스터 초기화와 유지 항목, 영구 공격력 +25% 안내가 접힘 밖에 보인다. |
| 긴 이름·큰 수치 | [긴 수치 화면](attempt-02/hero-long-values.png)에서 현재→수락 후 효과와 중첩 수치가 자연스럽게 줄바꿈된다. 가로 넘침이나 이름 생략을 찾지 못했다. |
| 키보드 | Native synthetic Tab/Shift+Tab으로 후보 이동, Enter/Space로 실제 환생 선택과 저장 확인. 실제 재굴림으로 DOM을 교체해도 규칙 펼침과 summary 포커스가 유지된다. |
| 수집 노출 | [동료 정원](attempt-02/full-roster.png)에서 30/30과 두 마리당 영혼 한 개 규칙이 보인다. [도감](attempt-02/codex-unread-first.png)은 194px 두 열이며 새 발견은 세 개씩 표시한다. 표시한 것만 확인 처리하고 [나머지 발견](attempt-02/codex-unread-remaining.png)을 남긴다. |
| 설정 | [음소거·흔들림 설정](attempt-02/presentation-settings.png)이 실제 설정에 저장되고 현재 필드로 전달된다. Electron webContents의 실제 음소거 상태도 일치한다. |
| 저장 오류 | 메뉴가 닫힌 상태에서 실제 저장 IPC가 실패한 뒤 [메뉴 재개방](attempt-02/reopened-save-error.png) 시 오류가 계속 보인다. 일반 상태 갱신은 오류를 지우지 않고, 실제 디스크 저장 성공 뒤에만 해제된다. |

Critic은 attempt-01의 기본/긴 수치 화면과 실제 재굴림 검증을 별도로 검토해 수용했다. 최종 설치본 attempt-02에서도 동일한 시각 결과와 수정된 접근성 이름을 확인했다. 추가 제품 UI 수정은 필요하지 않다.

검사에는 격리된 fixture만 사용했다. 실제 전역 훅 로드, OS 권한 요청, 네트워크 호출은 모두 0회다. 사람이 권한을 허용하는 과정, 실제 스피커 출력, 흔들림의 화면 진폭, 자연 획득 속도와 재미는 이 검사의 통과 항목이 아니다. 첫 실행·재시작·읽기 실패는 별도 startup 검사 범위다. 원본 로그에 Electron native menu의 `representedObject is not a WeakPtrToElectronMenuModelAsNSObject` 메시지가 두 번 있으나 이 실행에서 실패한 검사나 프로세스 종료 문제는 없었다.

초기 실행 attempt-01의 보고서와 PNG도 덮어쓰지 않고 보존했다.
