import { serve } from 'srvx/node';
import server from './dist/server/server.js';

const port = parseInt(process.env.PORT || '5000', 10);
const host = process.env.HOST || '127.0.0.1';

serve({
  port,
  host,
  fetch: server.fetch
});

console.log(`Server is running at http://${host}:${port}`);
