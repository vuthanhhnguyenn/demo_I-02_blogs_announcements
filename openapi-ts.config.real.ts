import { defaultPlugins, defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './src/lib/openapi.real.json',
  output: {
    lint: 'eslint',
    format: 'prettier',
    path: './src/lib/api-real',
  },
  plugins: [
    ...defaultPlugins,
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
    {
      asClass: true,
      name: '@hey-api/sdk',
    },
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../client.real.config',
    },
    '@tanstack/react-query',
  ],
});
