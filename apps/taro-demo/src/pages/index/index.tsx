import Taro from '@tarojs/taro';
import { Button, View } from '@tarojs/components';

export default function IndexPage() {
  return (
    <View style={{ padding: 16 }}>
      <View style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
        Demo Routes
      </View>

      <Button
        type="primary"
        onClick={() => Taro.navigateTo({ url: '/pages/layout/index' })}
      >
        布局渲染验证
      </Button>

      <View style={{ height: 12 }} />

      <Button
        type="primary"
        onClick={() => Taro.navigateTo({ url: '/pages/jsx/index' })}
      >
        JSX 渲染示例
      </Button>

      <View style={{ height: 12 }} />

      <Button onClick={() => Taro.navigateTo({ url: '/pages/single-component/index' })}>
        单组件 Demo（占位）
      </Button>
    </View>
  );
}
