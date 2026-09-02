import assert from 'node:assert/strict';

import { SECURITY_HEADERS, withSecurityHeaders } from '../lib/security-headers.js';

const secured = withSecurityHeaders(new Response('Prism', { headers: { 'Cache-Control': 'public, max-age=60' } }));

assert.equal(secured.headers.get('cache-control'), 'public, max-age=60');
assert.match(secured.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/u);
assert.match(secured.headers.get('content-security-policy') ?? '', /object-src 'none'/u);
assert.equal(secured.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
assert.equal(secured.headers.get('x-content-type-options'), 'nosniff');
assert.equal(Object.keys(SECURITY_HEADERS).length, 5);

console.log('Verified Prism security headers and preserved origin response headers.');
