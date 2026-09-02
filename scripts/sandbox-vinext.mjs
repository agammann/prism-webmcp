import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

if (process.argv.includes('dev')) process.env.WEBMCP_LENS_LOCAL_PREVIEW = '1';

// Vite probes Windows network-drive mappings with `net use`. The managed
// preview sandbox blocks child-process creation, so make that optional probe
// fail through its callback instead of emitting an unhandled EPERM event.
childProcess.exec = (_command, callback) => {
  queueMicrotask(() => callback?.(new Error('Network-drive probe unavailable'), '', ''));
  return {
    on() {
      return this;
    },
  };
};
syncBuiltinESMExports();

await import(new URL('../node_modules/vinext/dist/cli.js', import.meta.url));

