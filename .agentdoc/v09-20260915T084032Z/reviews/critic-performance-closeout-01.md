# Critic — performance 종료 입력 집계 감사

검토 및 구현 재확인: 2026-09-15 14:43 UTC.

범위: 변경 전 performance observer/reporter 코드, performance-02의 다섯 보고서와 raw 마지막 표본, Host가 제안한 verifier-only 수정. 제품·관측기·raw·프로토콜은 수정하지 않았다. 앱/장시간 관측을 재실행하지 않았다.

## 판단

**제안한 종료 구간 계산을 평가기의 시간 집계 오류 수정으로 승인한다.** `activeMilliseconds()`로 마지막 raw 이후 실제 종료 시간까지의 예정 입력을 계산하고 기존 cadence/jitter 규칙을 적용하는 것이 타당하다. 관측 3회에 맞춰 임의로 상한을 올리는 방식은 승인하지 않는다.

등록 구간의 입력 지표는 종료 시점을 덮는 마지막 raw sample의 값을 사용하고, 이후 종료 처리 중 추가된 입력은 별도 필드로 남겨야 한다. 기존 CPU/메모리 예산, 실제 시간 길이, raw 표본/각 phase, 저장 시간 지연, 무오류 조건은 유지한다. 이는 전체 performance PASS 선언이 아니며, 수정된 verifier의 반례 테스트 및 최종 comparison 재검증이 필요하다.

## 독립 확인한 사실

다섯 raw 파일의 SHA-256이 해당 관측 보고서와 모두 일치했다. 모두 observer passed=true, exitCode=0, errors=[]였다.

| 관측 | 마지막 raw 입력 | 최종 입력 | raw 이후 시간 | 추가 입력 |
|---|---:|---:|---:|---:|
| baseline-active | 3557 | 3557 | 50.784958 ms | 0 |
| baseline-idle | 0 | 0 | 45.173333 ms | 0 |
| candidate-active | 3553 | 3553 | 49.709500 ms | 0 |
| candidate-idle | 0 | 0 | 31.817958 ms | 0 |
| mixed | 10659 | 10662 | 1700.674542 ms | 3 |

mixed 마지막 raw는 elapsed **10800023.805625001 ms**, input **10659**이다. observationMs는 **10801724.480167 ms**, 최종 inputCount는 **10662**이다. 2152개 raw 표본과 20개 screenshot 기록이 있으며 마지막 두 screenshot은 `menu-180m`, `end`이다.

`performance.mjs`는 raw 표본을 쓴 뒤 해당 10분 메뉴 검사를 수행한다. 180분 표본에서도 마지막 메뉴를 열고 세 차례의 300 ms 대기, UI 조작, screenshot과 닫기를 마친 다음에야 반복문을 벗어나 입력 timer를 중단한다. 입력 timer는 관측 시작부터 계산한 기존 5분 active/idle 스케줄을 계속 따른다. 180분 직후는 다음 active 구간이므로 이 종료 처리 동안 세 번 더 입력된 것은 코드 순서와 일치한다.

기존 verifier의 `final inputCount - previousInputs <= inputJitter(2)`는 이 사이 시간을 항상 0으로 취급한다. 이는 raw 표본 사이에서 이미 사용하는 실제 시간별 입력 검증과 다르다.

## 수정의 근거와 한계

같은 스케줄로 계산한 mixed 종료 구간의 기대 입력은 다음과 같다.

```text
(activeMilliseconds(observationMs) - activeMilliseconds(lastRaw.elapsedMs)) / 500
= 3.4013490839973093
```

동일한 `ceil(expectedDelta) + inputJitter` 상한은 6이다. 실제 추가 3회는 이 범위에 들어간다. 기존 minimumFraction 및 jitter로 하한까지 계산하면 약 1.2313이며 관측 3회는 이 조건도 통과한다. 상한/예산 상수를 새로 도입할 필요가 없다.

기대 종료 입력이 0인 idle 구간에서는 jitter로 임의 입력을 허용하지 말고 추가 입력이 정확히 0이어야 한다. 최종 카운터는 정수이며 마지막 raw 이상이어야 한다. 종료 구간은 음수가 아니어야 하며 기존 observation duration/10초 종료 한도를 그대로 적용한다.

`observationMs`는 timer 중단 뒤 end screenshot 등의 짧은 처리도 포함하므로 정확한 timer-stop timestamp 자체는 아니다. 현재 네 비교 관측의 종료 오버헤드는 약 32–51 ms이고 mixed의 세 입력은 앞선 메뉴 처리와 일치한다. 이 기록만으로 종료 구간의 각 입력 이벤트 timestamp를 재구성했다고 주장하지 않는다.

보고 시 input.actual=10659를 사용할 경우 정확한 의미는 **등록 종료 시점을 덮는 마지막 raw sample 기준**이다. 이 표본은 명목 180분보다 약 23.806 ms 늦다. closeout.actual=3, closeout 시간/기대 입력, 원본 final inputCount=10662를 별도로 보존하여 명목 종료 순간의 정밀한 이벤트 집계로 오해되지 않게 한다. 종료 추가 입력을 등록 입력 비율을 높이는 데 사용하지 않는다.

## 계속 거부해야 할 반례

Host의 완전한 synthetic observation 테스트에서 다음을 확인해야 한다.

1. 입력 스케줄상 active인 유효한 짧은 closeout의 3회는 허용된다.
2. 같은 closeout에서 스케줄+기존 jitter 상한을 넘는 입력 burst는 거부된다.
3. idle closeout에서 추가 입력은 1회라도 거부된다.
4. 최종 입력 수가 마지막 raw보다 작거나 비정수/비유한 값이면 거부된다.
5. 최종 종료 시간이 마지막 raw보다 이르거나 기존 duration/10초 허용 범위를 넘으면 거부된다.
6. 종료 집계를 고쳐도 raw 입력 누락·phase 위반·저장 지연/회귀·오류·CPU/메모리 예산 위반은 계속 거부된다.

원래 reporter 거부와 옛 verifier를 보존하고, 변경 전후 verifier 해시 및 새 반례 테스트 결과를 별도 기록한다. 관측기·패키지·raw·프로토콜의 해시는 바뀌면 안 된다. 같은 입력을 수정된 평가기로 다시 해석한 결과이며 새로운 성능 측정으로 설명하지 않는다.

## 구현 후 독립 재확인 — 수락

Host가 수정한 `performance-report.mjs`, `performance.test.mjs`, `performance-verifier-tests-02.log`, 생성된 `comparison.json`을 다시 읽었다. 제안이 위 조건대로 구현됐으므로 **수락한다**.

- 종료 구간의 `finite(closeoutMs)`/기존 maxGap, 최종 정수 카운터, 스케줄 기반 상·하한, idle 추가 입력 0을 검사한다. 실제 추가 3회만 예외로 지정하는 분기는 없다.
- 등록 종료 표본의 actual=10659와 closeout actual=3/totalAtShutdown=10662가 별도로 저장된다.
- 합성 검사 로그는 3/3 PASS이다. 새 검사는 허용 사례와 감소·누락·과다 종료 입력, idle 1회, 20초 종료 초과, 본문 raw 입력 손실을 검사한다. 비정수 및 음수 종료 시간은 구현의 정수/finite 조건으로 거부됨을 읽었다. 이 두 사례를 별도 실행 테스트로 검증했다고 주장하지 않는다.
- comparison의 verifier/observer/protocol 해시를 현재 파일과 직접 대조했고 모두 일치했다. 보존된 옛 verifier 해시는 `b240a0045d11d942923bcc2d2ec7f35155d157d7564dbda209e934e871e96520`, 새 verifier는 `6611fade5fdbc33cfaec6401a24455cd9c59b561c42748b6bb40bdf9a29a318b`이다.
- 생성된 comparison은 PASS이다. active/idle CPU p95 및 working-set p95, mixed 메모리 증가 비교가 모두 기존 예산 안으로 보고된다. 이 독립 검토는 계산 코드와 생성/테스트 증거를 읽은 것이며 별도 5시간 재관측을 수행하지 않았다. Host의 최종 comparison verifier 실행과 다른 최종 게이트 연결은 그대로 필요하다.

기존 queue.json의 comparison 실패 상태는 당시 원본 평가 결과이므로 유지하고, 성공한 교정 평가를 별도 로그/보고서로 연결하는 처리가 맞다. 원래 실패를 관측 실패로 확대하거나 원래 queue를 성공으로 덮어쓸 필요가 없다.
