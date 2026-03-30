export default function errorHandler(err, req, res, next) {
  const msg = err.message || '';

  if (
    msg.includes('No fundamentals data') ||
    msg.includes('Not Found') ||
    msg.includes('No data found') ||
    msg.includes('HTTPError') ||
    msg.includes('404')
  ) {
    return res.status(404).json({ error: '종목을 찾을 수 없습니다. 종목 코드를 확인해주세요.' });
  }

  if (msg.includes('Too Many Requests') || msg.includes('429')) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  console.error('[ERROR]', msg);
  res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
}
