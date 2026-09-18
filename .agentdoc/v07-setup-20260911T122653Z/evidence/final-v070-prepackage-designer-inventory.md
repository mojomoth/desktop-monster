Designer `/root/designer`의 패키징 전 읽기 전용 대조 기록. 확인 시각: 2026-09-12T23:08:24.801730+00:00.

추가 보존이 필요한 파일: **없음**. 2026-09-12T04:24:18.095820+00:00의 보존 이후, 검사한 일반 파일 내용·앱 디렉터리·심볼릭 링크·압축본의 mode/mtime에서 변경이나 추가를 발견하지 않았다. 이 결론은 아래 보존 범위와 실제 비교 결과에 한정된다. 현재 실행 중인 180분 Native 출력/프로세스를 열거나 건드리지 않았고, 빌드·테스트·앱·package-check를 실행하지 않았다. 이번 새 보고서 외에는 쓰지 않았으며 압축본 재생성·추출·사용자 산출물 이동/삭제도 하지 않았다.

기준 보존물은 [manifest.json](../preservation/pre-v07-package/manifest.json)과 [기존 앱/metadata 압축본](../preservation/pre-v07-package/existing-app-and-builder-metadata.tar.gz)이다.

| 비교 | 실제 결과 |
|---|---|
| manifest SHA-256 | `cd40fbd5f9ec01c5ea9460281b4d516293795c4b1cc52428d396b6519e5c4a87` |
| archive 크기 / 실제 SHA-256 | 110070702 bytes / `a9ee6046924970f742a0bc5884141a282378d32af9aabe4bb631ad616923ba15`; manifest와 일치 |
| manifest 307개 일반 파일 vs 현재 release | 307/307 SHA 일치, 추가 0·누락 0·내용 변경 0 |
| archive 내부 297개 일반 파일 vs manifest/현재 | 모두 SHA 일치. 압축 내부 스트림을 읽었고 파일시스템에 추출하지 않음 |
| archive 14개 심볼릭 링크 vs 현재 | 링크 경로·대상 모두 일치, 추가 0·누락 0 |
| archive 앱 디렉터리 vs 현재 | 추가·누락 없음. archive 멤버의 권한 mode와 mtime도 차이 없음(mtime 비교 허용 오차 1µs) |

`Path.is_file()`로 링크 대상을 따라가면 311개처럼 보이지만, 추가처럼 잡히는 4개는 다음 기존 framework 심볼릭 링크다. 14개 링크와 함께 원래 압축본에 보존되어 있으며 새 파일이 아니다.

- `release/mac-arm64/DesMon.app/Contents/Frameworks/Electron Framework.framework/Electron Framework` → `Versions/Current/Electron Framework`
- `release/mac-arm64/DesMon.app/Contents/Frameworks/Mantle.framework/Mantle` → `Versions/Current/Mantle`
- `release/mac-arm64/DesMon.app/Contents/Frameworks/ReactiveObjC.framework/ReactiveObjC` → `Versions/Current/ReactiveObjC`
- `release/mac-arm64/DesMon.app/Contents/Frameworks/Squirrel.framework/Squirrel` → `Versions/Current/Squirrel`

최종 package가 갱신할 기존 경로 `release/mac-arm64/DesMon.app`, `release/builder-debug.yml`, `release/latest-mac.yml`은 이미 위 압축본에 현재와 동일한 상태로 보존되어 있다. 현재 앱 Info.plist의 `CFBundleShortVersionString`과 `CFBundleVersion`은 모두 **0.6.0**이고 latest metadata도 0.6.0 DMG를 가리킨다. 이 mutable 앱 경로를 이미 생성된 최종 0.7 앱으로 해석하면 안 된다.

과거 DMG 및 blockmap은 0.1.0/0.2.0/0.3.0/0.4.0/0.6.0 각 2개, 총 10개가 release에 그대로 있으며 모두 manifest 해시와 같다. 이 10개는 압축본에 넣지 않고 원위치 유지하도록 기록된 범위다. 새 0.7 DMG/blockmap은 현재 없다. 기존 버전별 산출물을 보존하는 현재 package 경로 계약에서는 추가 복사 대상이 발견되지 않았다.

현재 package.json, package-lock.json 최상위 및 packages[''] 버전은 모두 0.7.0이고 config.targetAppVersion도 0.7.0이다. `package.json:17,43–47`의 package 명령은 build 후 서명 자동 탐색을 끄고 arm64 DMG를 release에 생성한다. 이번 조사에서는 이 명령을 실행하지 않았다.

`package-check.mjs` 전체와 해당 단위 테스트는 읽기만 했다. 현재 코드의 실제 검사 범위는 다음과 같다.

- `134–158`: 지정 `.app/Contents/MacOS/DesMon`과 app.asar의 SHA를 기록하고 실제 packaged production main을 SMOKE로 실행해 exit 0/SMOKE_OK를 확인한다. 이어 inspector로 main 실행 전 userData를 소유 임시 폴더로 결박하고, 실제 runtime appPath가 지정 asar인지 검사한다. 성공 종료 억제는 검사 프로세스의 inspector 경로에만 적용하고 실패 watchdog은 남긴다.
- `159–164`: 일반 모드에서 런타임 버전 0.7.0을 확인하고, 현재 dist/static 파일의 SHA와 packaged asar의 대응 파일을 모두 비교한다. 서버 산출물 `dist/electron/server`는 의도적으로 제외된다. 이 비교의 기준은 현재 빌드 파일이므로 같은 소스의 선행 build/gates 근거와 함께 해석해야 한다.
- `165–206`: 합성 레거시 fixture와 격리된 identity 기록을 쓰고 실제 재시작 경로에서 레벨/XP/재화/동료/영웅 이력/PvP 전적/훈련/도감 상태를 비교한다. 미획득 도감 ACK의 레거시 정규화, h03 목표 선택의 renderer→preload→IPC→save 저장, 재시작 보존과 실제 메뉴 PNG를 확인한다. 이 목표 클릭은 DOM `.click()`이므로 Native 키보드/마우스 신뢰 이벤트 증거와 구별한다.
- `210–221`: 소유 프로세스들의 정상 종료, 시작/끝 source·evaluator·asar·실행 파일 SHA 불변을 확인하고 소유 임시 폴더를 정리한다. 사용자 save/auth를 fixture로 복사하는 경로는 없다.

일반 모드의 check는 현재 10개다. `--probe`는 버전·파일 일치·레거시/UI/재시작 검사 블록을 생략하므로 최종 package 검증의 대체가 아니다. 이 스크립트 자체는 DMG/blockmap/latest metadata의 존재·내용·설치 동작, 서명/공증, 모든 번들 리소스, 실제 Accessibility/전역 입력·운영 PvP·사람 관찰을 검사하지 않는다. DMG 산출과 실제 package 실행 결과는 Host의 이후 원본 근거로 별도 확인해야 하며 이 인벤토리를 package PASS로 기록하지 않는다.

주요 현재 파일 SHA-256:

| 경로 | SHA-256 |
|---|---|
| `release/mac-arm64/DesMon.app/Contents/Info.plist` | `02e288404b93f2baefabe27ad672a10c03bc0f5d46aa40f30fd6828a0005808c` |
| `release/builder-debug.yml` | `9f65d6b10335af8dfb8ae3f8def867419494ea6a58a64908e9d58375054602cf` |
| `release/latest-mac.yml` | `c23498bf408505631c183ab7d750a041fe6a9864358f6b21a924151344c707dc` |
| `.harness/v7/loop/package-check.mjs` | `f7b1d8fbd531d00b9c729250639c8390ceef865984e79dd546e382328fd7a5c7` |
| `package.json` | `bafe3965bcc46eb2b61dc07f1a89283561619f676032a77dcccd34a32a3c073a` |
| `package-lock.json` | `fd7f73b6343c8e4363f42b502def8e0bcdb663061489d199e86e407b6d1e6137` |

추가 보존이나 패키징을 승인/실행한 문서가 아니며, 이후 release 경로가 변경되면 그 변경 파일은 다시 대조해야 한다. 사람 관찰은 `humanChecks=PENDING`이다.
