# Legacy API Cleanup Plan

## 목표

현재는 프론트와 외부 링크 호환을 위해 legacy query parameter와 alias endpoint를 유지하고 있다.
다음 단계에서는 사용 흔적을 확인한 뒤 점진적으로 정리한다.

## 현재 유지 중인 legacy 항목

### Query parameter aliases

- `target_date`
- `date`
- `startDate`
- `endDate`

### Endpoint alias

- `/api/stock/signal-date`

## 현재 canonical 계약

- historical snapshot: `snapshot_date`
- backtest: `start_date`, `end_date`
- canonical endpoint: `/api/stock/historical-snapshot`

## 제거 순서

### 1단계: 코드 기준 고정

- 프론트에서는 canonical 파라미터만 사용한다.
- 테스트도 canonical 계약만 검증한다.
- 문서도 canonical 계약만 기준으로 안내한다.

### 2단계: deprecation 안내 추가

- legacy 파라미터나 endpoint 사용 시
  - 서버 로그에 경고를 남기거나
  - `meta.deprecated` 같은 필드를 일시적으로 넣는다.

### 3단계: 사용 여부 확인

- Render 로그 또는 서버 로그 기준으로
  legacy 호출이 실제로 남아 있는지 확인한다.

### 4단계: 제거

- `target_date`, `date` 제거
- `startDate`, `endDate` 제거
- `/api/stock/signal-date` 제거
- smoke test와 프론트 재검증

## 제거 전 체크리스트

- public 프론트에서 legacy 파라미터 사용 흔적 없음
- 문서에서 legacy 계약 언급 없음
- 외부 공유 링크 또는 즐겨찾기 영향 검토
- smoke test 통과

## 메모

이번 스레드에서는 안정성 우선으로 legacy를 남겨두었다.
이 문서는 다음 정리 스레드에서 바로 실행할 수 있는 기준선 역할을 한다.
