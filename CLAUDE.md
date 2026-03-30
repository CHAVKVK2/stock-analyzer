# Stock Analyzer — CLAUDE.md

한국/미국 주식 기술적 분석 및 재무제표 웹 애플리케이션.

---

## 기술 스택

- **Node.js** (v24) + **Express** v4 — ESM(`"type": "module"`)
- **yahoo-finance2** v3, **technicalindicators** v3
- 인메모리 캐시 (TTL 5분, `Map` 기반, `yahooFinanceService.js`)
- 프론트엔드: 바닐라 JS (`'use strict'`, ES6+), 빌드 도구 없음
- **Chart.js** v4 (CDN) + **chartjs-adapter-date-fns**

---

## 프로젝트 구조

```
stock-analyzer/
├── server.js
├── src/
│   ├── routes/         # stockRoutes.js, searchRoutes.js
│   ├── services/       # yahooFinanceService.js, technicalService.js, tickerResolver.js
│   └── middleware/     # errorHandler.js
└── public/
    └── js/             # app.js, charts.js, financials.js
```

---

## 코드 작성 규칙

- 백엔드는 **ESM** (`import/export`), CommonJS `require` 사용 금지
- 프론트엔드 JS는 빌드 없이 브라우저 직접 로드 — `import/export` 사용 불가
- 새 기술 지표는 `technicalService.js`에 추가, 결과 배열은 `prices`와 동일 길이로 앞을 `null` 패딩
- 새 yahoo-finance2 호출은 `yahooFinanceService.js`의 `getCached` / `setCache` 패턴 유지
- 에러는 반드시 `next(err)`로 넘겨 `errorHandler.js`에서 처리
- CSS는 `styles.css`의 기존 다크 테마 변수 사용

---

## Ticker suffix 규칙 (`tickerResolver.js`)

- 숫자만 → `.KS` 자동 추가 (KOSPI)
- 영문/영숫자 → 미국 주식 그대로
- `suffix` 파라미터로 수동 지정 가능 (`.KS`, `.KQ`, `none`, `auto`)