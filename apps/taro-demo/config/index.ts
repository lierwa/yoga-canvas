import { withYogaCanvasTaroConfig } from '@yoga-canvas/taro';

const config = {
  projectName: 'yoga-canvas-taro-demo',
  date: '2026-02-26',
  designWidth: 375,
  deviceRatio: {
    375: 2,
    750: 1,
    828: 1.81,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  framework: 'react',
  compiler: {
    type: 'webpack5',
  },
  mini: {},
  h5: {},
};

export default withYogaCanvasTaroConfig(config);
