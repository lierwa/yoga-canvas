import { Button, Image as TaroImage, View as TaroView } from '@tarojs/components';
import { useMemo, useRef, useState } from 'react';
import type { YogaCanvas } from '@yoga-canvas/core';
import { Image, ScrollView, Text, View } from '@yoga-canvas/react';
import { CanvasContainer } from '@yoga-canvas/taro';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 667;

export default function JSXPage() {
  const [ready, setReady] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [tempPath, setTempPath] = useState('');

  const instanceRef = useRef<YogaCanvas | null>(null);
  const list = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        title: `Scroll item ${i + 1}`,
        subtitle: '在此区域上下拖动，观察滚动条出现与淡出',
        dotColor: i % 3 === 0 ? '#14b8a6' : i % 3 === 1 ? '#6366f1' : '#f59e0b',
        bg: i % 2 === 0 ? 'rgba(99, 102, 241, 0.05)' : 'rgba(20, 184, 166, 0.05)',
      })),
    [],
  );
  const canExport = ready && instanceRef.current;

  return (
    <TaroView style={{ padding: 16 }}>
      <TaroView style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
        JSX 渲染示例（小程序 Canvas 2D）
      </TaroView>

      <TaroView style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
        <CanvasContainer
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          rootName="Root"
          rootStyle={{
            height: CANVAS_HEIGHT,
            backgroundColor: '#ffffff',
            padding: 16,
            gap: 12,
            flexDirection: 'column',
          }}
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
          <View
            name="Header"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#6366f1',
              borderRadius: 12,
              padding: 16,
              gap: 12,
            }}
          >
            <Image
              name="Avatar"
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=yoga"
              objectFit="cover"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }}
            />
            <View name="HeaderText" style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff' }}>
                Yoga Canvas
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)' }}>
                使用 View/Text/Image/ScrollView JSX 标签构建
              </Text>
            </View>
          </View>

          <View name="Cards" style={{ flexDirection: 'row', gap: 12 }}>
            <View
              name="CardA"
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#6366f1' }}>
                128
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>Nodes</Text>
            </View>
            <View
              name="CardB"
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0ea5e9' }}>
                16ms
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>Render</Text>
            </View>
            <View
              name="CardC"
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#22c55e' }}>
                60
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>FPS</Text>
            </View>
          </View>

          <ScrollView
            name="FeatureList"
            scrollDirection="vertical"
            scrollBarVisibility="auto"
            style={{
              flex: 1,
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 12,
              gap: 10,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            {list.map((item) => (
              <View
                key={item.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: item.bg,
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: item.dotColor,
                  }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a' }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </CanvasContainer>
      </TaroView>

      <TaroView style={{ height: 12 }} />

      {errorText ? (
        <TaroView style={{ color: '#b91c1c', marginBottom: 12 }}>
          {errorText}
        </TaroView>
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
        <TaroView style={{ marginTop: 12 }}>
          <TaroView style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
            导出结果：
          </TaroView>
          <TaroImage
            src={tempPath}
            mode="widthFix"
            style={{ width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}
          />
        </TaroView>
      ) : null}
    </TaroView>
  );
}
