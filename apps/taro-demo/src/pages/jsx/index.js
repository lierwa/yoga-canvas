import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Image as TaroImage, View as TaroView } from '@tarojs/components';
import { useMemo, useRef, useState } from 'react';
import { Image, ScrollView, Text, View } from '@yoga-canvas/react';
import { CanvasContainer } from '@yoga-canvas/taro';
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 667;
export default function JSXPage() {
    const [ready, setReady] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [tempPath, setTempPath] = useState('');
    const instanceRef = useRef(null);
    const list = useMemo(() => Array.from({ length: 18 }).map((_, i) => ({
        title: `Scroll item ${i + 1}`,
        subtitle: '在此区域上下拖动，观察滚动条出现与淡出',
        dotColor: i % 3 === 0 ? '#14b8a6' : i % 3 === 1 ? '#6366f1' : '#f59e0b',
        bg: i % 2 === 0 ? 'rgba(99, 102, 241, 0.05)' : 'rgba(20, 184, 166, 0.05)',
    })), []);
    const canExport = ready && instanceRef.current;
    return (_jsxs(TaroView, { style: { padding: 16 }, children: [_jsx(TaroView, { style: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 }, children: "JSX \u6E32\u67D3\u793A\u4F8B\uFF08\u5C0F\u7A0B\u5E8F Canvas 2D\uFF09" }), _jsx(TaroView, { style: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }, children: _jsxs(CanvasContainer, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rootName: "Root", rootStyle: {
                        height: CANVAS_HEIGHT,
                        backgroundColor: '#ffffff',
                        padding: 16,
                        gap: 12,
                        flexDirection: 'column',
                    }, containerStyle: { width: `${CANVAS_WIDTH}px` }, canvasStyle: { background: '#ffffff' }, debugIndicator: true, onReady: (info) => {
                        instanceRef.current = info.instance;
                        setReady(true);
                        setErrorText('');
                    }, onError: (e) => {
                        instanceRef.current = null;
                        setReady(false);
                        setErrorText(e.message);
                    }, children: [_jsxs(View, { name: "Header", style: {
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#6366f1',
                                borderRadius: 12,
                                padding: 16,
                                gap: 12,
                            }, children: [_jsx(Image, { name: "Avatar", src: "https://api.dicebear.com/7.x/avataaars/svg?seed=yoga", objectFit: "cover", style: {
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    } }), _jsxs(View, { name: "HeaderText", style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' }, children: "Yoga Canvas" }), _jsx(Text, { style: { fontSize: 12, color: 'rgba(255, 255, 255, 0.85)' }, children: "\u4F7F\u7528 View/Text/Image/ScrollView JSX \u6807\u7B7E\u6784\u5EFA" })] })] }), _jsxs(View, { name: "Cards", style: { flexDirection: 'row', gap: 12 }, children: [_jsxs(View, { name: "CardA", style: {
                                        flex: 1,
                                        backgroundColor: '#ffffff',
                                        borderRadius: 12,
                                        padding: 12,
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0',
                                        gap: 6,
                                    }, children: [_jsx(Text, { style: { fontSize: 22, fontWeight: 'bold', color: '#6366f1' }, children: "128" }), _jsx(Text, { style: { fontSize: 12, color: '#64748b' }, children: "Nodes" })] }), _jsxs(View, { name: "CardB", style: {
                                        flex: 1,
                                        backgroundColor: '#ffffff',
                                        borderRadius: 12,
                                        padding: 12,
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0',
                                        gap: 6,
                                    }, children: [_jsx(Text, { style: { fontSize: 22, fontWeight: 'bold', color: '#0ea5e9' }, children: "16ms" }), _jsx(Text, { style: { fontSize: 12, color: '#64748b' }, children: "Render" })] }), _jsxs(View, { name: "CardC", style: {
                                        flex: 1,
                                        backgroundColor: '#ffffff',
                                        borderRadius: 12,
                                        padding: 12,
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0',
                                        gap: 6,
                                    }, children: [_jsx(Text, { style: { fontSize: 22, fontWeight: 'bold', color: '#22c55e' }, children: "60" }), _jsx(Text, { style: { fontSize: 12, color: '#64748b' }, children: "FPS" })] })] }), _jsx(ScrollView, { name: "FeatureList", scrollDirection: "vertical", scrollBarVisibility: "auto", style: {
                                flex: 1,
                                flexDirection: 'column',
                                backgroundColor: '#ffffff',
                                borderRadius: 12,
                                padding: 12,
                                gap: 10,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                            }, children: list.map((item) => (_jsxs(View, { style: {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                    backgroundColor: item.bg,
                                    borderRadius: 10,
                                    padding: 10,
                                }, children: [_jsx(View, { style: {
                                            width: 8,
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: item.dotColor,
                                        } }), _jsxs(View, { style: { flex: 1, gap: 2 }, children: [_jsx(Text, { style: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' }, children: item.title }), _jsx(Text, { style: { fontSize: 11, color: '#475569' }, children: item.subtitle })] })] }, item.title))) })] }) }), _jsx(TaroView, { style: { height: 12 } }), errorText ? (_jsx(TaroView, { style: { color: '#b91c1c', marginBottom: 12 }, children: errorText })) : null, _jsx(Button, { disabled: !canExport, type: "primary", onClick: async () => {
                    if (!instanceRef.current)
                        return;
                    const path = await instanceRef.current.canvasToTempFilePath();
                    setTempPath(path);
                }, children: "\u5BFC\u51FA\u56FE\u7247" }), tempPath ? (_jsxs(TaroView, { style: { marginTop: 12 }, children: [_jsx(TaroView, { style: { fontSize: 12, color: '#475569', marginBottom: 8 }, children: "\u5BFC\u51FA\u7ED3\u679C\uFF1A" }), _jsx(TaroImage, { src: tempPath, mode: "widthFix", style: { width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' } })] })) : null] }));
}
