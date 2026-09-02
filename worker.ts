import handler from 'vinext/server/fetch-handler';

import { withSecurityHeaders } from './lib/security-headers.js';

const prismWorker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(response);
  },
};

export default prismWorker;
