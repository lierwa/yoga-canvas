import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type DemoLocale = 'zh' | 'en';

type MessageKey =
  | 'home.tagline'
  | 'home.subtitle'
  | 'home.hero.lead'
  | 'home.hero.highlight'
  | 'home.hero.tail'
  | 'home.intro'
  | 'home.cta'
  | 'home.stats.layoutEngine'
  | 'home.stats.renderTarget'
  | 'home.stats.editor'
  | 'home.stats.export'
  | 'lang.switchToEn'
  | 'lang.switchToZh'
  | 'nav.back'
  | 'nav.backHome'
  | 'nav.locate'
  | 'nav.locateTitle'
  | 'product.playground.subtitle'
  | 'product.playground.desc'
  | 'product.playground.b1'
  | 'product.playground.b2'
  | 'product.playground.b3'
  | 'product.workspace.subtitle'
  | 'product.workspace.desc'
  | 'product.workspace.b1'
  | 'product.workspace.b2'
  | 'product.workspace.b3'
  | 'product.components.subtitle'
  | 'product.components.desc'
  | 'product.components.b1'
  | 'product.components.b2'
  | 'product.components.b3'
  | 'playground.inspector.show'
  | 'playground.inspector.hide'
  | 'playground.inspector.title'
  | 'playground.inspector.subtitle'
  | 'editor.projectMissing'
  | 'editor.backWorkspace'
  | 'editor.backWorkspaceTitle'
  | 'editor.back'
  | 'editor.backTitle'
  | 'editor.saving'
  | 'editor.saved'
  | 'editor.loading'
  | 'workspace.title'
  | 'workspace.desc'
  | 'workspace.defaultProjectName'
  | 'workspace.newProject'
  | 'workspace.addProject'
  | 'workspace.addProjectDesc'
  | 'workspace.recentUpdated'
  | 'workspace.preset.custom'
  | 'workspace.action.rename'
  | 'workspace.action.duplicate'
  | 'workspace.action.delete'
  | 'workspace.modal.create.title'
  | 'workspace.modal.create.cancel'
  | 'workspace.modal.create.createAndOpen'
  | 'workspace.modal.create.projectName'
  | 'workspace.modal.create.projectNamePlaceholder'
  | 'workspace.modal.create.canvasSize'
  | 'workspace.modal.create.templateLockedHint'
  | 'workspace.modal.create.width'
  | 'workspace.modal.create.height'
  | 'workspace.modal.create.selectTemplate'
  | 'workspace.modal.rename.title'
  | 'workspace.modal.rename.cancel'
  | 'workspace.modal.rename.save'
  | 'workspace.modal.rename.projectName'
  | 'workspace.modal.rename.placeholder'
  | 'template.seed_blank.name'
  | 'template.seed_blank.desc'
  | 'template.seed_legacy_demo.name'
  | 'template.seed_legacy_demo.desc'
  | 'template.seed_share_poster.name'
  | 'template.seed_share_poster.desc';

const STORAGE_KEY = 'yoga-canvas.demo.locale.v1';

const messages: Record<DemoLocale, Record<MessageKey, string>> = {
  zh: {
    'home.tagline': 'Yoga Canvas',
    'home.subtitle': '基于 Yoga Layout 的 Canvas 画布引擎',
    'home.hero.lead': '一个面向',
    'home.hero.highlight': '布局与可视化编辑',
    'home.hero.tail': '的 Canvas 引擎与组件库',
    'home.intro':
      '用 Yoga（Flexbox）计算布局，把 View/Text/Image/ScrollView 这类节点树渲染到 Canvas；并提供命中测试、选中高亮、缩放平移与属性调参等编辑能力，支持导出 JSON / DOM / 图片，适配 H5 与微信小程序。',
    'home.cta': '立即体验',
    'home.stats.layoutEngine': 'Yoga 布局',
    'home.stats.renderTarget': '渲染输出',
    'home.stats.editor': '编辑交互',
    'home.stats.export': '导出格式',
    'lang.switchToEn': '切换至英文',
    'lang.switchToZh': '切换至中文',
    'nav.back': '返回',
    'nav.backHome': '返回首页',
    'nav.locate': '聚焦画布',
    'nav.locateTitle': '聚焦当前节点',
    'product.playground.subtitle': '即时体验编辑能力',
    'product.playground.desc': '在同一屏里完成“数据/JSX → 渲染 → 选中 → 调参”，快速验证布局、交互与导出链路。',
    'product.playground.b1': 'Live JSX → Canvas',
    'product.playground.b2': '节点树与选中',
    'product.playground.b3': '缩放/平移/对齐',
    'product.workspace.subtitle': '项目化的设计工作台',
    'product.workspace.desc': '把模板变成可管理的项目：创建、复制、重命名，并进入编辑器持续迭代与协作。',
    'product.workspace.b1': '项目列表管理',
    'product.workspace.b2': '可视化编辑器',
    'product.workspace.b3': '预览与导出',
    'product.components.subtitle': '能力覆盖一眼看清',
    'product.components.desc': '用“设计稿式”的画布展示核心组件与布局能力，帮助你快速评估可用范围与落地效果。',
    'product.components.b1': '只读展示',
    'product.components.b2': 'Flex / gap / grid',
    'product.components.b3': 'Image fill / ScrollView',
    'playground.inspector.show': '显示右侧栏',
    'playground.inspector.hide': '隐藏右侧栏',
    'playground.inspector.title': '检查器',
    'playground.inspector.subtitle': '节点树 · 属性',
    'editor.projectMissing': '项目不存在或已被删除',
    'editor.backWorkspace': '返回工作台',
    'editor.backWorkspaceTitle': '返回工作台',
    'editor.back': '返回',
    'editor.backTitle': '返回工作台',
    'editor.saving': '保存中…',
    'editor.saved': '已保存',
    'editor.loading': '正在加载 Yoga 布局引擎…',
    'workspace.title': '工作台',
    'workspace.desc': '每个模板就像一个项目。你可以在这里创建、复制、重命名、删除，然后进入二级页面进行低代码编辑。',
    'workspace.defaultProjectName': '我的项目',
    'workspace.newProject': '新建项目',
    'workspace.addProject': '新增项目',
    'workspace.addProjectDesc': '从空白模板创建你的新画布',
    'workspace.recentUpdated': '最近更新：',
    'workspace.preset.custom': '自定义',
    'workspace.action.rename': '重命名',
    'workspace.action.duplicate': '复制',
    'workspace.action.delete': '删除',
    'workspace.modal.create.title': '新建项目',
    'workspace.modal.create.cancel': '取消',
    'workspace.modal.create.createAndOpen': '创建并打开',
    'workspace.modal.create.projectName': '项目名称',
    'workspace.modal.create.projectNamePlaceholder': '例如：我的海报',
    'workspace.modal.create.canvasSize': '画布尺寸',
    'workspace.modal.create.templateLockedHint': '当前模板的画布尺寸由模板决定，创建时不可修改',
    'workspace.modal.create.width': '宽度',
    'workspace.modal.create.height': '高度',
    'workspace.modal.create.selectTemplate': '选择模板',
    'workspace.modal.rename.title': '重命名项目',
    'workspace.modal.rename.cancel': '取消',
    'workspace.modal.rename.save': '保存',
    'workspace.modal.rename.projectName': '项目名称',
    'workspace.modal.rename.placeholder': '请输入新名称',
    'template.seed_blank.name': '空白模板',
    'template.seed_blank.desc': '从零开始搭建布局',
    'template.seed_legacy_demo.name': '展示 Demo（原 src 模板）',
    'template.seed_legacy_demo.desc': '包含常用节点与样式示例',
    'template.seed_share_poster.name': '分享海报模板',
    'template.seed_share_poster.desc': '带海报卡片与二维码示例',
  },
  en: {
    'home.tagline': 'Yoga Canvas',
    'home.subtitle': 'A Canvas engine powered by Yoga Layout',
    'home.hero.lead': 'A Canvas engine for',
    'home.hero.highlight': 'layout and visual editing',
    'home.hero.tail': 'with a component system',
    'home.intro':
      'Compute layout with Yoga (flexbox), render a View/Text/Image/ScrollView node tree on Canvas, and power editor interactions like hit-testing, selection highlight, zoom/pan, and property tweaking. Export to JSON / DOM / image with adapters for H5 and WeChat Mini Program.',
    'home.cta': 'Get Started',
    'home.stats.layoutEngine': 'Yoga layout',
    'home.stats.renderTarget': 'Render output',
    'home.stats.editor': 'Editor tools',
    'home.stats.export': 'Export formats',
    'lang.switchToEn': 'Switch to English',
    'lang.switchToZh': '切换中文',
    'nav.back': 'Back',
    'nav.backHome': 'Back to Home',
    'nav.locate': 'Locate',
    'nav.locateTitle': 'Locate selected node',
    'product.playground.subtitle': 'Try the editor instantly',
    'product.playground.desc': 'Go from “data/JSX → render → select → tweak” on one screen to validate layout, interaction, and export fast.',
    'product.playground.b1': 'Live JSX → Canvas',
    'product.playground.b2': 'Node tree & selection',
    'product.playground.b3': 'Zoom / pan / align',
    'product.workspace.subtitle': 'Project-based workspace',
    'product.workspace.desc': 'Turn templates into projects: create, duplicate, rename, and iterate in the editor.',
    'product.workspace.b1': 'Project list',
    'product.workspace.b2': 'Visual editor',
    'product.workspace.b3': 'Preview & export',
    'product.components.subtitle': 'See capabilities at a glance',
    'product.components.desc': 'A design-spec-like canvas that showcases core components and layout features for quick evaluation.',
    'product.components.b1': 'Read-only showcase',
    'product.components.b2': 'Flex / gap / grid',
    'product.components.b3': 'Image fill / ScrollView',
    'playground.inspector.show': 'Show inspector',
    'playground.inspector.hide': 'Hide inspector',
    'playground.inspector.title': 'Inspector',
    'playground.inspector.subtitle': 'NodeTree · Properties',
    'editor.projectMissing': 'Project not found or deleted',
    'editor.backWorkspace': 'Back to Workspace',
    'editor.backWorkspaceTitle': 'Back to Workspace',
    'editor.back': 'Back',
    'editor.backTitle': 'Back to Workspace',
    'editor.saving': 'Saving…',
    'editor.saved': 'Saved',
    'editor.loading': 'Loading Yoga Layout Engine…',
    'workspace.title': 'Workspace',
    'workspace.desc': 'Each template is a project. Create, duplicate, rename, delete — then enter the editor to iterate.',
    'workspace.defaultProjectName': 'My project',
    'workspace.newProject': 'New project',
    'workspace.addProject': 'Add project',
    'workspace.addProjectDesc': 'Start from a blank canvas',
    'workspace.recentUpdated': 'Updated:',
    'workspace.preset.custom': 'Custom',
    'workspace.action.rename': 'Rename',
    'workspace.action.duplicate': 'Duplicate',
    'workspace.action.delete': 'Delete',
    'workspace.modal.create.title': 'New project',
    'workspace.modal.create.cancel': 'Cancel',
    'workspace.modal.create.createAndOpen': 'Create & open',
    'workspace.modal.create.projectName': 'Project name',
    'workspace.modal.create.projectNamePlaceholder': 'e.g. My poster',
    'workspace.modal.create.canvasSize': 'Canvas size',
    'workspace.modal.create.templateLockedHint': 'Canvas size is defined by the template and cannot be changed on create',
    'workspace.modal.create.width': 'Width',
    'workspace.modal.create.height': 'Height',
    'workspace.modal.create.selectTemplate': 'Choose template',
    'workspace.modal.rename.title': 'Rename project',
    'workspace.modal.rename.cancel': 'Cancel',
    'workspace.modal.rename.save': 'Save',
    'workspace.modal.rename.projectName': 'Project name',
    'workspace.modal.rename.placeholder': 'Enter a new name',
    'template.seed_blank.name': 'Blank template',
    'template.seed_blank.desc': 'Start from scratch',
    'template.seed_legacy_demo.name': 'Legacy demo template',
    'template.seed_legacy_demo.desc': 'Common nodes and style samples',
    'template.seed_share_poster.name': 'Share poster template',
    'template.seed_share_poster.desc': 'Poster card + QR sample',
  },
};

type I18nApi = {
  locale: DemoLocale;
  setLocale: (locale: DemoLocale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nApi | null>(null);

function safeReadLocale(): DemoLocale | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'zh' || raw === 'en') return raw;
  return null;
}

export function DemoI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<DemoLocale>(() => safeReadLocale() ?? 'zh');

  const setLocale = useCallback((next: DemoLocale) => {
    setLocaleState(next);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocaleState((cur) => (cur === 'zh' ? 'en' : 'zh'));
  }, []);

  const t = useCallback(
    (key: MessageKey) => {
      return messages[locale][key];
    },
    [locale],
  );

  const api = useMemo<I18nApi>(() => ({ locale, setLocale, toggleLocale, t }), [locale, setLocale, t, toggleLocale]);

  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}

export function useDemoI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: 'zh',
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: MessageKey) => messages.zh[key],
    };
  }
  return ctx;
}
