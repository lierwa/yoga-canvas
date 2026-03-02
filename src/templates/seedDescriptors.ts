import type { NodeDescriptor } from '@yoga-canvas/core';
import { getLegacyDemoDescriptor } from '../hooks/useNodeTree';

export type SeedTemplate = {
  id: string;
  name: string;
  description?: string;
  descriptor: NodeDescriptor;
};

const SHARE_POSTER_HERO_SRC =
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0b1220"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
        <radialGradient id="g1" cx="30%" cy="20%" r="60%">
          <stop offset="0" stop-color="rgba(99,102,241,0.65)"/>
          <stop offset="1" stop-color="rgba(99,102,241,0)"/>
        </radialGradient>
        <radialGradient id="g2" cx="72%" cy="62%" r="65%">
          <stop offset="0" stop-color="rgba(236,72,153,0.55)"/>
          <stop offset="1" stop-color="rgba(236,72,153,0)"/>
        </radialGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect width="1200" height="800" fill="url(#bg)"/>
      <rect width="1200" height="800" fill="url(#g1)"/>
      <rect width="1200" height="800" fill="url(#g2)"/>
      <g filter="url(#blur)" opacity="0.9">
        <circle cx="220" cy="160" r="160" fill="rgba(34,211,238,0.35)"/>
        <circle cx="1030" cy="610" r="220" fill="rgba(129,140,248,0.32)"/>
        <circle cx="860" cy="180" r="140" fill="rgba(16,185,129,0.22)"/>
      </g>
      <g opacity="0.12">
        <path d="M0 560 C 220 480 360 650 560 560 C 760 470 880 560 1200 460 L 1200 800 L 0 800 Z" fill="#ffffff"/>
      </g>
    </svg>`,
  )}`;

const SHARE_POSTER_QR_SRC =
  'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fexample.com';

export const seedTemplates: SeedTemplate[] = [
  {
    id: 'seed_blank',
    name: '空白模板',
    description: '从零开始搭建布局',
    descriptor: {
      type: 'view',
      name: 'Root',
      style: {
        width: 375,
        height: 667,
        flexDirection: 'column',
        backgroundColor: '#ffffff',
      },
      children: [],
    },
  },
  {
    id: 'seed_legacy_demo',
    name: '展示 Demo（原 src 模板）',
    description: '包含常用节点与样式示例',
    descriptor: getLegacyDemoDescriptor(),
  },
  {
    id: 'seed_share_poster',
    name: '分享海报模板',
    description: '带海报卡片与二维码示例',
    descriptor: {
      type: 'view',
      name: 'Root',
      style: {
        width: 375,
        height: 'auto',
        flexDirection: 'column',
        backgroundColor: '#0b1220',
        padding: 16,
        gap: 12,
      },
      children: [
        {
          type: 'view',
          name: 'PosterCard',
          style: {
            flexDirection: 'column',
            backgroundColor: '#0f172a',
            linearGradient: {
              start: { x: 0, y: 0 },
              end: { x: 1, y: 1 },
              colors: [
                { offset: 0, color: '#0f172a' },
                { offset: 1, color: '#111827' },
              ],
            },
            borderRadius: 20,
            padding: 16,
            gap: 12,
            boxShadow: { color: 'rgba(2,6,23,0.55)', blur: 20, offsetX: 0, offsetY: 10 },
          },
          children: [
            {
              type: 'view',
              name: 'BrandRow',
              style: { flexDirection: 'row', alignItems: 'center', gap: 10 },
              children: [
                {
                  type: 'view',
                  name: 'BrandMark',
                  style: {
                    width: 28,
                    height: 28,
                    borderRadius: 10,
                    backgroundColor: 'rgba(99,102,241,0.24)',
                    borderWidth: 1,
                    borderColor: 'rgba(129,140,248,0.28)',
                  },
                },
                {
                  type: 'view',
                  name: 'BrandText',
                  style: { flexDirection: 'column', gap: 1, flex: 1 },
                  children: [
                    {
                      type: 'text',
                      name: 'BrandName',
                      content: 'Yoga Canvas',
                      style: {
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#e2e8f0',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                      },
                    },
                    {
                      type: 'text',
                      name: 'BrandSub',
                      content: '分享海报 · 小程序风格',
                      style: {
                        fontSize: 10,
                        color: 'rgba(226,232,240,0.68)',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                      },
                    },
                  ],
                },
                {
                  type: 'view',
                  name: 'Badge',
                  style: {
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 6,
                    paddingBottom: 6,
                    borderRadius: 999,
                    backgroundColor: 'rgba(16,185,129,0.16)',
                    borderWidth: 1,
                    borderColor: 'rgba(52,211,153,0.22)',
                  },
                  children: [
                    {
                      type: 'text',
                      content: 'HOT',
                      style: { fontSize: 10, fontWeight: 800, color: '#6ee7b7', whiteSpace: 'nowrap' },
                    },
                  ],
                },
              ],
            },
            {
              type: 'view',
              name: 'HeroImage',
              style: {
                height: 240,
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(148,163,184,0.18)',
                linearGradient: {
                  start: { x: 0, y: 0 },
                  end: { x: 1, y: 1 },
                  colors: [
                    { offset: 0, color: 'rgba(99,102,241,0.24)' },
                    { offset: 1, color: 'rgba(236,72,153,0.18)' },
                  ],
                },
              },
              children: [
                {
                  type: 'image',
                  name: 'HeroPhoto',
                  src: SHARE_POSTER_HERO_SRC,
                  objectFit: 'cover',
                  style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
                },
                {
                  type: 'view',
                  name: 'HeroGlow1',
                  style: {
                    position: 'absolute',
                    left: -60,
                    top: -60,
                    width: 200,
                    height: 200,
                    borderRadius: 999,
                    backgroundColor: 'rgba(34,211,238,0.22)',
                  },
                },
                {
                  type: 'view',
                  name: 'HeroGlow2',
                  style: {
                    position: 'absolute',
                    right: -80,
                    bottom: -80,
                    width: 240,
                    height: 240,
                    borderRadius: 999,
                    backgroundColor: 'rgba(129,140,248,0.22)',
                  },
                },
                {
                  type: 'view',
                  name: 'HeroCaption',
                  style: {
                    position: 'absolute',
                    left: 14,
                    bottom: 14,
                    right: 14,
                    borderRadius: 14,
                    backgroundColor: 'rgba(2,6,23,0.30)',
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(148,163,184,0.18)',
                  },
                  children: [
                    {
                      type: 'text',
                      content: '今日推荐 · 把内容一键做成分享海报',
                      style: { fontSize: 12, fontWeight: 800, color: '#e2e8f0', whiteSpace: 'nowrap' },
                    },
                  ],
                },
              ],
            },
            {
              type: 'view',
              name: 'Copy',
              style: { flexDirection: 'column', gap: 6 },
              children: [
                {
                  type: 'text',
                  name: 'Title',
                  content: '把你喜欢的内容做成海报',
                  style: {
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.2,
                    whiteSpace: 'normal',
                  },
                },
                {
                  type: 'text',
                  name: 'Subtitle',
                  content: '一键生成分享图，长按识别二维码，立即体验。',
                  style: {
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.78)',
                    lineHeight: 1.6,
                    whiteSpace: 'normal',
                  },
                },
              ],
            },
            {
              type: 'view',
              name: 'BottomBar',
              style: {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingTop: 10,
                borderWidth: 1,
                borderColor: 'rgba(148,163,184,0.16)',
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.05)',
                paddingLeft: 12,
                paddingRight: 12,
                paddingBottom: 12,
              },
              children: [
                {
                  type: 'view',
                  name: 'QRCode',
                  style: {
                    width: 70,
                    height: 70,
                    borderRadius: 14,
                    backgroundColor: '#ffffff',
                    padding: 8,
                  },
                  children: [
                    {
                      type: 'image',
                      name: 'QRImage',
                      src: SHARE_POSTER_QR_SRC,
                      objectFit: 'contain',
                      style: { width: '100%', height: '100%' },
                    },
                  ],
                },
                {
                  type: 'view',
                  name: 'Hint',
                  style: { flex: 1, flexDirection: 'column', gap: 4 },
                  children: [
                    {
                      type: 'text',
                      content: '长按识别二维码',
                      style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0', whiteSpace: 'nowrap' },
                    },
                    {
                      type: 'text',
                      content: '进入小程序 · 查看更多',
                      style: { fontSize: 11, color: 'rgba(226,232,240,0.72)', whiteSpace: 'nowrap' },
                    },
                    {
                      type: 'view',
                      name: 'TinyTags',
                      style: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
                      children: [
                        {
                          type: 'view',
                          name: 'Tag1',
                          style: {
                            paddingLeft: 8,
                            paddingRight: 8,
                            paddingTop: 4,
                            paddingBottom: 4,
                            borderRadius: 999,
                            backgroundColor: 'rgba(99,102,241,0.18)',
                          },
                          children: [
                            { type: 'text', content: '高清导出', style: { fontSize: 10, color: '#c7d2fe', whiteSpace: 'nowrap' } },
                          ],
                        },
                        {
                          type: 'view',
                          name: 'Tag2',
                          style: {
                            paddingLeft: 8,
                            paddingRight: 8,
                            paddingTop: 4,
                            paddingBottom: 4,
                            borderRadius: 999,
                            backgroundColor: 'rgba(236,72,153,0.18)',
                          },
                          children: [
                            { type: 'text', content: '布局引擎', style: { fontSize: 10, color: '#fbcfe8', whiteSpace: 'nowrap' } },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
];

export function getSeedTemplate(id: string): SeedTemplate | null {
  return seedTemplates.find((t) => t.id === id) ?? null;
}
