import { createApp } from './app.js';

const port = Number(process.env.PORT || 8787);
const { app } = createApp();

app.listen(port, '127.0.0.1', () => {
  console.log(`이슬골 마을 수첩  http://127.0.0.1:${port}`);
});
