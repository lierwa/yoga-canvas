import type { UserConfigExport } from '@tarojs/cli';
import baseConfig from './index';

export default {
  ...baseConfig,
} satisfies UserConfigExport;
