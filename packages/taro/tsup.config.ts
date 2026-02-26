import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/node.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'yoga-layout',
    'react',
    'react/jsx-runtime',
    '@tarojs/taro',
    '@tarojs/components',
    '@yoga-canvas/core',
    '@yoga-canvas/react',
  ],
});
