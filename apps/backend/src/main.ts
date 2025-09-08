import dotenv from 'dotenv';
dotenv.config();
import { createServer } from './server/app.js';
import { ensureAdmin } from './bootstrap.js';

const app = createServer();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

await ensureAdmin();

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
