import { Button, Image, View } from '@tarojs/components';
import { useMemo, useRef, useState } from 'react';
import { Text as YogaText, View as YogaView, type YogaCanvas } from '@yoga-canvas/core';
import { CanvasContainer } from '@yoga-canvas/taro';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;

function createSampleLayout() {
  return YogaView({
    name: 'Root',
    style: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      padding: 16,
      backgroundColor: '#f8fafc',
    },
    children: [
      YogaView({
        name: 'Header',
        style: {
          height: 64,
          padding: 12,
          backgroundColor: '#111827',
          borderRadius: 12,
          justifyContent: 'center',
        },
        children: [
          YogaText({
            name: 'Title',
            style: {
              color: '#ffffff',
              fontSize: 16,
              lineHeight: 1.2,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            },
            content: 'yoga-canvas (wx) 渲染验证',
          }),
        ],
      }),
      YogaView({ name: 'Spacer', style: { height: 12 } }),
      YogaView({
        name: 'Row',
        style: {
          flexDirection: 'row',
          gap: 12,
        },
        children: [
          YogaView({
            name: 'LeftCard',
            style: {
              flexGrow: 1,
              height: 120,
              padding: 12,
              backgroundColor: '#ffffff',
              borderRadius: 12,
            },
            children: [
              YogaText({
                name: 'LeftText',
                style: { color: '#111827', fontSize: 14, lineHeight: 1.4, whiteSpace: 'normal' },
                content: 'Flex: 1 卡片\n支持换行与多行高度',
              }),
            ],
          }),
          YogaView({
            name: 'RightCard',
            style: {
              width: 110,
              height: 120,
              padding: 12,
              backgroundColor: '#e0f2fe',
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            },
            children: [
              YogaText({
                name: 'RightText',
                style: { color: '#075985', fontSize: 12, lineHeight: 1.2, whiteSpace: 'nowrap' },
                content: '固定宽度',
              }),
            ],
          }),
        ],
      }),
      YogaView({ name: 'Spacer2', style: { height: 12 } }),
      YogaView({
        name: 'Footer',
        style: {
          padding: 12,
          backgroundColor: '#ffffff',
          borderRadius: 12,
        },
        children: [
          YogaText({
            name: 'FooterText',
            style: { color: '#334155', fontSize: 12, lineHeight: 1.4, whiteSpace: 'normal' },
            content: '点击“导出图片”调用 wx.canvasToTempFilePath',
          }),
        ],
      }),
    ],
  });
}

export default function LayoutPage() {
  const [ready, setReady] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [tempPath, setTempPath] = useState('');

  const layout = useMemo(() => createSampleLayout(), []);

  const instanceRef = useRef<YogaCanvas | null>(null);

  const canExport = ready && instanceRef.current;

  return (
    <View style={{ padding: 16 }}>
      <View style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
        布局渲染验证（小程序 Canvas 2D）
      </View>

      <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
        <CanvasContainer
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          layout={layout}
          containerStyle={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
          canvasStyle={{ background: '#ffffff' }}
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
        />
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
