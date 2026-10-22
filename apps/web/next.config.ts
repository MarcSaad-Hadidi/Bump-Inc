import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import type { NextConfig } from 'next';

const envFile = resolve(import.meta.dirname, '../../.env');
// Next workers reject --env-file in inherited NODE_OPTIONS; load the file before workers spawn.
if (existsSync(envFile)) loadEnvFile(envFile);

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
};

export default config;
