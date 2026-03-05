import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Taro from '@tarojs/taro';
import { Button, View } from '@tarojs/components';
export default function IndexPage() {
    return (_jsxs(View, { style: { padding: 16 }, children: [_jsx(View, { style: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 }, children: "Demo Routes" }), _jsx(Button, { type: "primary", onClick: () => Taro.navigateTo({ url: '/pages/layout/index' }), children: "\u5E03\u5C40\u6E32\u67D3\u9A8C\u8BC1" }), _jsx(View, { style: { height: 12 } }), _jsx(Button, { type: "primary", onClick: () => Taro.navigateTo({ url: '/pages/jsx/index' }), children: "JSX \u6E32\u67D3\u793A\u4F8B" }), _jsx(View, { style: { height: 12 } }), _jsx(Button, { onClick: () => Taro.navigateTo({ url: '/pages/single-component/index' }), children: "\u5355\u7EC4\u4EF6 Demo\uFF08\u5360\u4F4D\uFF09" })] }));
}
