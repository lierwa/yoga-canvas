import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Image, View } from '@tarojs/components';
import { useMemo, useRef, useState } from 'react';
import { CanvasContainer } from '@yoga-canvas/taro';
import { createNodeTemplateDescriptor } from '../../templates/nodeTemplates';
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 667;
export default function LayoutPage() {
    const [ready, setReady] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [tempPath, setTempPath] = useState('');
    const layout = useMemo(() => createNodeTemplateDescriptor({ width: CANVAS_WIDTH }), []);
    const instanceRef = useRef(null);
    const canExport = ready && instanceRef.current;
    return (_jsxs(View, { style: { padding: 16 }, children: [_jsx(View, { style: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 }, children: "\u5E03\u5C40\u6E32\u67D3\u9A8C\u8BC1\uFF08\u5C0F\u7A0B\u5E8F Canvas 2D\uFF09" }), _jsx(View, { style: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }, children: _jsx(CanvasContainer, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, layout: layout, containerStyle: { width: `${CANVAS_WIDTH}px` }, canvasStyle: { background: '#ffffff' }, debugIndicator: true, onReady: (info) => {
                        instanceRef.current = info.instance;
                        setReady(true);
                        setErrorText('');
                    }, onError: (e) => {
                        instanceRef.current = null;
                        setReady(false);
                        setErrorText(e.message);
                    } }) }), _jsx(View, { style: { height: 12 } }), errorText ? (_jsx(View, { style: { color: '#b91c1c', marginBottom: 12 }, children: errorText })) : null, _jsx(Button, { disabled: !canExport, type: "primary", onClick: async () => {
                    if (!instanceRef.current)
                        return;
                    const path = await instanceRef.current.canvasToTempFilePath();
                    setTempPath(path);
                }, children: "\u5BFC\u51FA\u56FE\u7247" }), tempPath ? (_jsxs(View, { style: { marginTop: 12 }, children: [_jsx(View, { style: { fontSize: 12, color: '#475569', marginBottom: 8 }, children: "\u5BFC\u51FA\u7ED3\u679C\uFF1A" }), _jsx(Image, { src: tempPath, mode: "widthFix", style: { width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' } })] })) : null] }));
}
