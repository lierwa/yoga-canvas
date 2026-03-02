import { Button, Image, View } from '@tarojs/components';
import { useMemo, useRef, useState } from 'react';
import type { YogaCanvas } from '@yoga-canvas/core';
import { CanvasContainer } from '@yoga-canvas/taro';
import { createNodeTemplateJSX } from '../../templates/nodeTemplates';

const CANVAS_WIDTH = 360;

export default function JSXPage() {
  const [ready, setReady] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [tempPath, setTempPath] = useState('');

  const instanceRef = useRef<YogaCanvas | null>(null);
  const template = useMemo(
    () => createNodeTemplateJSX({ width: CANVAS_WIDTH }),
    [],
  );
  const canExport = ready && instanceRef.current;

  return (
    <View style={{ padding: 16 }}>
      <View style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
        JSX 渲染示例（小程序 Canvas 2D）
      </View>

      <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
        <CanvasContainer
          width={CANVAS_WIDTH}
          rootName={template.rootName}
          rootStyle={template.rootStyle}
          containerStyle={{ width: `${CANVAS_WIDTH}px` }}
          canvasStyle={{ background: '#ffffff' }}
          debugIndicator
          onReady={(info) => {
            instanceRef.current = info.instance;
            setReady(true);
            setErrorText('');
          }}
          onError={(e) => {
            instanceRef.current = null;
            setReady(false);
            setErrorText(e.message);
          }}
        >
          {template.children}
        </CanvasContainer>
      </View>

      <View style={{ height: 12 }} />

      {errorText ? (
        <View style={{ color: '#b91c1c', marginBottom: 12 }}>
          {errorText}
        </View>
      ) : null}

      <Button
        disabled={!canExport}
        type="primary"
        onClick={async () => {
          if (!instanceRef.current) return;
          const path = await instanceRef.current.canvasToTempFilePath();
          setTempPath(path);
        }}
      >
        导出图片
      </Button>

      {tempPath ? (
        <View style={{ marginTop: 12 }}>
          <View style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
            导出结果：
          </View>
          <Image
            src={tempPath}
            mode="widthFix"
            style={{ width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}
          />
        </View>
      ) : null}
    </View>
  );
}
