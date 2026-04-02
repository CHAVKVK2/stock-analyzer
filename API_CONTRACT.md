# API Contract

## 목적

프론트엔드와 테스트가 같은 계약을 기준으로 동작하도록 주요 API의 요청 파라미터와 응답 형식을 고정한다.

## 공통 원칙

### 성공 응답

모든 성공 응답은 아래 형태를 따른다.

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

모든 에러 응답은 아래 형태를 따른다.

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

Legacy aliases are still accepted for compatibility:

- `target_date`
- `date`

### `/api/stock/signal-date`

- legacy alias endpoint
- internally `/api/stock/historical-snapshot`와 같은 계약을 사용

### `/api/stock/backtest`

- `ticker` required
- `start_date` required
- `end_date` required
- `range` optional, default `5y`
- `suffix` optional, default `auto`
- `strategy` optional, default `balanced`

Legacy aliases are still accepted for compatibility:

- `startDate`
- `endDate`

### `/api/search`

- `q` optional
- 빈 값이면 `suggestions: []`를 반환

### `/api/news/:symbol`

- `symbol` path param required

## Response Highlights

### `/api/stock/technical`

`data`에는 아래 핵심 필드가 포함된다.

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

- `request.snapshotDate`: 요청한 날짜
- `dates.requested`: 요청한 날짜
- `dates.resolved`: 실제 계산 기준일
- `snapshot.date`: 실제 스냅샷 날짜
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
- 에러는 `payload.error.message`를 우선 사용한다.
- `historical-snapshot`과 `backtest`는 canonical 날짜 파라미터를 사용한다.
