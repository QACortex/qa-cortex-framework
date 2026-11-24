// Cross-package import through the workspace symlink + exports subpath.
import { ConfigError, defineConfig, loadConfig } from '@spike/a/config';

const def = defineConfig({
  base: { baseURL: 'http://localhost:3000', timeouts: { action: 5000 } },
  profiles: { local: {}, staging: { baseURL: 'https://staging.example.test' } },
});

export const loaded = loadConfig(def, 'staging');
export const isConfigError = (e: unknown): e is ConfigError => e instanceof ConfigError;
