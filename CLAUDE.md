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

## 작업 모드

- **기능 추가** — "~추가해줘", "~만들어줘" → 관련 파일 확인 후 구현. 반드시 기존 패턴(캐시, 에러핸들링, null 패딩) 준수.
- **버그 수정** — "~안 돼", "에러 나" → 에러 메시지 분석 → 최소 변경으로 수정. 다른 기능 건드리지 말 것.
- **리팩토링** — "~정리해줘", "구조 개선" → 동작 변경 없이 코드 정리. 변경 전후 동작 동일 확인.
- **설명/질문** — "~어떻게 동작해?" → 코드 수정 없이 설명만.

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