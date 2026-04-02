# API Contract

## 목적

프론트엔드, 테스트, 유지보수가 같은 기준으로 동작하도록 주요 API의 요청 파라미터와 응답 형식을 고정한다.

## 공통 응답 형식

### 성공 응답

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "generatedAt": "2026-04-02T03:00:00.000Z",
    "endpoint": "/api/stock/technical"
  }
}
```

### 에러 응답

```json
{
  "ok": false,
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "종목 또는 데이터를 찾을 수 없습니다. 입력값을 확인해주세요."
  }
}
```

## Canonical Query Parameters

### `/api/stock/technical`

- `ticker` required
- `range` optional, default `6mo`
- `suffix` optional, default `auto`
- `strategy` optional, default `balanced`

### `/api/stock/historical-snapshot`

- `ticker` required
- `snapshot_date` required
- `range` optional, default `2y`
- `suffix` optional, default `auto`
- `strategy` optional, default `balanced`
- if `snapshot_date` is outside the fetched `range`, return `404 NO_DATA_IN_RANGE`

### `/api/stock/backtest`

- `ticker` required
- `start_date` required
- `end_date` required
- `range` optional, default `5y`
- `suffix` optional, default `auto`
- `strategy` optional, default `balanced`
- if the requested period is outside the fetched `range`, return `404 NO_DATA_IN_RANGE`

### `/api/search`

- `q` optional
- 빈 값이면 `suggestions: []` 반환

### `/api/news/:symbol`

- `symbol` path param required

## Deprecated Contract

### `/api/stock/signal-date`

- 더 이상 사용하지 않음
- 현재는 `410 DEPRECATED_ENDPOINT` 반환
- 대체 경로:
  - `/api/stock/historical-snapshot?snapshot_date=YYYY-MM-DD`

### Deprecated query parameters

다음 파라미터는 더 이상 지원하지 않는다.

- `target_date`
- `date`
- `startDate`
- `endDate`

## 응답 핵심 필드

### `/api/stock/technical`

- `ticker`
- `resolvedTicker`
- `strategy`
- `request`
- `meta`
- `prices`
- `indicators`
- `marketState`
- `signalScores`
- `signalSummary`

### `/api/stock/historical-snapshot`

- `request.snapshotDate`
- `dates.requested`
- `dates.resolved`
- `snapshot.date`
- `signalScores`
- `signalSummary`

### `/api/stock/backtest`

- `request.startDate`
- `request.endDate`
- `requestedRange`
- `actualRange`
- `summary`
- `statistics`
- `equityCurve`
- `trades`
- `results`

## 프론트 처리 규칙

- 프론트는 `payload.data`만 사용한다.
- 에러 메시지는 `payload.error.message`를 우선 사용한다.
- historical snapshot과 backtest는 canonical 날짜 파라미터만 사용한다.
