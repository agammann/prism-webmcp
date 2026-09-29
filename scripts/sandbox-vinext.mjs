if (process.argv.includes('dev')) process.env.WEBMCP_LENS_LOCAL_PREVIEW = '1';
await import(new URL('../node_modules/vinext/dist/cli.js', import.meta.url));
