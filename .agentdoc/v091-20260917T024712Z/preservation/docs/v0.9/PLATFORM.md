# v0.9 플랫폼 준비

## Windows 11 x64

```sh
npm ci
npm test && npm run lint && npm run typecheck
npm run package:win
npm run smoke:win
node scripts/windows.mjs manifest
```

`release/DesMon Setup 0.9.0.exe`는 NSIS 설치본,
`release/win-unpacked/DesMon.exe`는 SteamPipe에도 사용하는 실행 파일이다.
Windows CI는 Node 22.14와 windows-2022에서 위 명령을 실행하고 해시·설치본·unpacked를 보관한다.
CI runner는 Windows 11 실기기 검증을 대신하지 않는다.
앱 식별자는 `dev.desmon.app`, 저장 폴더는 `%APPDATA%/DesMon`이며 제거 시 저장을 삭제하지 않는다.

네이티브 `uiohook-napi`와 Steam `.node`/DLL은 ASAR 밖에 패키징한다.
Windows 실기기 입력, 알림·트레이, DPI 100/150/200%, 다중 모니터,
설치→업데이트→제거→재설치 후 저장 유지 검사는 **PENDING**이다.

## Steam 선택적 초기화

`steamworks.js` 0.4.0을 optionalDependency로 고정했다. Electron 39.8.10/macOS arm64에서
네이티브 모듈 로딩을 확인했다. 이는 Steam 계정 초기화 성공을 의미하지 않는다.
`DESMON_STEAM_APP_ID`가 유효하면 main에서 초기화하고 Steam 사용자 ID·이름을 얻는다.
미설정·누락 SDK·실행되지 않은 Steam은 일반 실행을 유지한다. 게임 계정은 통합하지 않는다.
스모크는 Steam을 호출하지 않는다. 업적·Cloud·오버레이는 이번 범위에 없다.

```sh
npm run prepare:steam -- release/win-unpacked OUTPUT_DIR APP_ID DEPOT_ID
```

이 명령은 원본을 변경하지 않고 unpacked 전체 해시와 `app.vdf`/`depot.vdf`를 만든다.
실행 파일·Steam DLL·Windows 바인딩 존재를 검사하고 개발용 `steam_appid.txt`가 있으면 거절한다.
`Preview=1`인 구성만 생성하며 업로드 명령은 실행하지 않는다. 실제 AppID·DepotID와
파트너 SDK의 ContentBuilder/steamcmd는 Steamworks 계정에서 준비해야 한다.
실제 Steam 초기화·SteamPipe 업로드·Steam 설치는 **PENDING**이다.

참고: [Steamworks 초기화](https://partner.steamgames.com/doc/sdk/api),
[SteamPipe 배포](https://partner.steamgames.com/doc/sdk/uploading),
[steamworks.js 소스](https://github.com/ceifa/steamworks.js).

## 서버 선행 배포

클라이언트 배포 전에 `src/server/pgStore.ts` 마이그레이션을 격리 PostgreSQL에서 검증한다.
새 서버는 인증된 `/v1/me`, 네 지표 순위, 트랜잭션 내 결과 영수증과 영구 제거·ID 할당 기록을 제공한다.
구서비스가 같은 DB에 스냅샷을 써도 trigger가 제거 기록과 할당 상한을 유지한다.
백필은 현재 남아 있는 제거·도난 기록만 복구하며 과거에 소실된 기록을 복원하지 않는다.
구형 서버에 접속하면 v0.9 온라인 기능은 안전하게 보류된다.
운영 배포·실제 DB 마이그레이션·공개 출시·서명/공증은 이 작업에서 수행하지 않는다.
