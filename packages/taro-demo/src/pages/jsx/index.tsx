import { Button, Image, View } from '@tarojs/components';
import { useRef, useState } from 'react';
import type { YogaCanvas } from '@yoga-canvas/core';
import { View as YogaView, Text as YogaText } from '@yoga-canvas/react';
import { CanvasContainer } from '@yoga-canvas/taro';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;

export default function JSXPage() {
  const [ready, setReady] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [tempPath, setTempPath] = useState('');

  const instanceRef = useRef<YogaCanvas | null>(null);
  const canExport = ready && instanceRef.current;

  return (
    <View style={{ padding: 16 }}>
      <View style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
        JSX 渲染示例（小程序 Canvas 2D）
      </View>

      <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
        <CanvasContainer
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          rootStyle={{ padding: 16, backgroundColor: '#f8fafc' }}
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
        >
          <YogaView
            name="Header"
            style={{
              height: 64,
              padding: 12,
              backgroundColor: '#111827',
              borderRadius: 12,
              justifyContent: 'center',
            }}
          >
            <YogaText
              name="Title"
              style={{
                color: '#ffffff',
                fontSize: 16,
                lineHeight: 1.2,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              yoga-canvas JSX (wx)
            </YogaText>
          </YogaView>

          <YogaView name="Spacer" style={{ height: 12 }} />

          <YogaView
            name="Row"
            style={{
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <YogaView
              name="LeftCard"
              style={{
                flexGrow: 1,
                height: 120,
                padding: 12,
                backgroundColor: '#ffffff',
                borderRadius: 12,
              }}
            >
              <YogaText
                name="LeftText"
                style={{ color: '#111827', fontSize: 14, lineHeight: 1.4, whiteSpace: 'normal' }}
              >
                Flex: 1 卡片{'\n'}支持换行与多行高度
              </YogaText>
            </YogaView>

            <YogaView
              name="RightCard"
              style={{
                width: 110,
                height: 120,
                padding: 12,
                backgroundColor: '#e0f2fe',
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <YogaText
                name="RightText"
                style={{ color: '#075985', fontSize: 12, lineHeight: 1.2, whiteSpace: 'nowrap' }}
              >
                固定宽度
              </YogaText>
            </YogaView>
          </YogaView>

          <YogaView name="Spacer2" style={{ height: 12 }} />

          <YogaView
            name="Footer"
            style={{
              padding: 12,
              backgroundColor: '#ffffff',
              borderRadius: 12,
            }}
          >
            <YogaText
              name="FooterText"
              style={{ color: '#334155', fontSize: 12, lineHeight: 1.4, whiteSpace: 'normal' }}
            >
              JSX → descriptor → canvas 渲染{'\n'}导出图片走 wx.canvasToTempFilePath
            </YogaText>
          </YogaView>
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
