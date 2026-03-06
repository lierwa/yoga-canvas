import type {
  PlatformAdapter,
  CanvasImageLike,
  CanvasContextLike,
  CanvasGradientLike,
  TextMeasureOptions,
} from '../types';
import { clampWrappedLines, ellipsizeToWidth, normalizeLineClamp, wrapText } from '../text/textLayout';

/**
 * WeChat mini-program canvas context wrapper implementing CanvasContextLike.
 * Expects a WX Canvas 2D context (wx.createCanvasContext is deprecated;
 * this targets the newer Canvas.getContext('2d') API).
 */
class WxCanvasContext implements CanvasContextLike {
  private ctx: CanvasRenderingContext2D;
  private scaleX = 1;
  private scaleY = 1;
  private scaleStack: Array<{ x: number; y: number }> = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  save(): void {
    this.ctx.save();
    this.scaleStack.push({ x: this.scaleX, y: this.scaleY });
  }
  restore(): void {
    this.ctx.restore();
    const prev = this.scaleStack.pop();
    if (prev) {
      this.scaleX = prev.x;
      this.scaleY = prev.y;
    } else {
      this.scaleX = 1;
      this.scaleY = 1;
    }
  }
  translate(x: number, y: number): void { this.ctx.translate(x, y); }
  scale(sx: number, sy: number): void {
    this.scaleX *= sx;
    this.scaleY *= sy;
    this.ctx.scale(sx, sy);
  }
  rotate(angle: number): void { this.ctx.rotate(angle); }
  clip(): void { this.ctx.clip(); }

  beginPath(): void { this.ctx.beginPath(); }
  closePath(): void { this.ctx.closePath(); }
  moveTo(x: number, y: number): void { this.ctx.moveTo(x, y); }
  lineTo(x: number, y: number): void { this.ctx.lineTo(x, y); }
  arc(x: number, y: number, r: number, s: number, e: number, ccw?: boolean): void {
    this.ctx.arc(x, y, r, s, e, ccw);
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void {
    this.ctx.arcTo(x1, y1, x2, y2, r);
  }
  rect(x: number, y: number, w: number, h: number): void { this.ctx.rect(x, y, w, h); }

  fill(): void { this.ctx.fill(); }
  stroke(): void { this.ctx.stroke(); }
  fillRect(x: number, y: number, w: number, h: number): void { this.ctx.fillRect(x, y, w, h); }
  strokeRect(x: number, y: number, w: number, h: number): void { this.ctx.strokeRect(x, y, w, h); }
  clearRect(x: number, y: number, w: number, h: number): void { this.ctx.clearRect(x, y, w, h); }

  setFillStyle(style: string | CanvasGradientLike): void { this.ctx.fillStyle = style as CanvasFillStrokeStyles['fillStyle']; }
  setStrokeStyle(style: string | CanvasGradientLike): void { this.ctx.strokeStyle = style as CanvasFillStrokeStyles['strokeStyle']; }
  setLineWidth(width: number): void { this.ctx.lineWidth = width; }
  setLineDash(segments: number[]): void { this.ctx.setLineDash(segments); }
  setGlobalAlpha(alpha: number): void { this.ctx.globalAlpha = alpha; }
  setShadow(color: string, blur: number, offsetX: number, offsetY: number): void {
    if (typeof (this.ctx as unknown as { setShadow?: (...args: unknown[]) => void }).setShadow === 'function') {
      (this.ctx as unknown as { setShadow: (x: number, y: number, blur: number, color: string) => void })
        .setShadow(offsetX, offsetY, blur, color);
    } else {
      (this.ctx as CanvasRenderingContext2D).shadowColor = color;
      (this.ctx as CanvasRenderingContext2D).shadowBlur = blur;
      (this.ctx as CanvasRenderingContext2D).shadowOffsetX = offsetX;
      (this.ctx as CanvasRenderingContext2D).shadowOffsetY = offsetY;
    }
  }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike {
    return this.ctx.createLinearGradient(x0, y0, x1, y1);
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradientLike {
    return this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }

  setFont(font: string): void { this.ctx.font = font; }
  setTextAlign(align: 'left' | 'center' | 'right'): void { this.ctx.textAlign = align; }
  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic'): void {
    this.ctx.textBaseline = baseline;
  }
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    if (maxWidth !== undefined) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }
  measureText(text: string): { width: number } {
    if (Math.abs(this.scaleX - 1) <= 1e-6 && Math.abs(this.scaleY - 1) <= 1e-6) {
      return { width: this.ctx.measureText(text).width };
    }

    this.ctx.save();
    this.ctx.scale(1 / (this.scaleX || 1), 1 / (this.scaleY || 1));
    const width = this.ctx.measureText(text).width;
    this.ctx.restore();
    return { width };
  }

  drawImage(image: CanvasImageLike, dx: number, dy: number, dw: number, dh: number): void {
    this.ctx.drawImage(image as CanvasImageSource, dx, dy, dw, dh);
  }
}

// WX types (minimal declarations to avoid wx typings dependency)
interface WxCanvas {
  getContext(type: '2d'): CanvasRenderingContext2D;
  createImage(): WxImage;
}

interface WxImage extends CanvasImageLike {
  src: string;
  onload: (() => void) | null;
  onerror: ((err: unknown) => void) | null;
}

const imageCache = new Map<string, WxImage>();

declare const wx: {
  canvasToTempFilePath(options: Record<string, unknown>): void;
};

function resolveLineHeightPx(fontSize: number, lineHeight: number): number {
  if (!Number.isFinite(fontSize) || fontSize <= 0) return 0;
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return fontSize * 1.2;
  return lineHeight < 4 ? fontSize * lineHeight : lineHeight;
}

/**
 * WeChat mini-program platform adapter.
 */
export class WxAdapter implements PlatformAdapter {
  name = 'wx';

  private wxCanvas: WxCanvas | null = null;
  private renderCallback: (() => void) | null = null;

  setRenderCallback(cb: (() => void) | null): void {
    this.renderCallback = cb;
  }

  /** Must be called with the WX canvas instance before use. */
  setCanvas(canvas: WxCanvas): void {
    this.wxCanvas = canvas;
  }

  measureText(options: TextMeasureOptions): { width: number; height: number } {
    // In WX mini-program, we use canvas measureText + manual line-height calc
    // since there is no DOM.
    const ctx = this.wxCanvas?.getContext('2d');
    if (!ctx) {
      // Fallback estimation
      return estimateTextSize(options);
    }

    const fontWeight = typeof options.fontWeight === 'number' ? options.fontWeight : options.fontWeight;
    const fontStyle = options.fontStyle && options.fontStyle !== 'normal' ? `${options.fontStyle} ` : '';
    ctx.font = `${fontStyle}${fontWeight !== 'normal' ? `${fontWeight} ` : ''}${options.fontSize}px ${options.fontFamily || 'sans-serif'}`;
    const lineH = resolveLineHeightPx(options.fontSize, options.lineHeight);
    const lineClamp = normalizeLineClamp(options.lineClamp);

    if (options.whiteSpace === 'nowrap') {
      const singleLine = options.content.replace(/\n/g, ' ');
      if (lineClamp) {
        const displayed = ellipsizeToWidth(ctx, singleLine, options.availableWidth);
        return { width: Math.min(ctx.measureText(displayed).width, options.availableWidth), height: lineH };
      }
      return { width: ctx.measureText(singleLine).width, height: lineH };
    }

    const lines = wrapText(ctx, options.content, options.availableWidth);
    const displayedLines = lineClamp
      ? clampWrappedLines(ctx, lines, lineClamp, options.availableWidth, options.content.includes(' ') ? ' ' : '')
      : lines;

    let maxLineWidth = 0;
    for (const line of displayedLines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }

    return {
      width: Math.min(maxLineWidth, options.availableWidth),
      height: Math.max(1, displayedLines.length) * lineH,
    };
  }

  loadImage(src: string): Promise<CanvasImageLike> {
    if (!this.wxCanvas) {
      return Promise.reject(new Error('WX canvas not set. Call setCanvas() first.'));
    }
    const cached = imageCache.get(src);
    if (cached && cached.width && cached.height) {
      return Promise.resolve(cached);
    }
    return new Promise((resolve, reject) => {
      const img = this.wxCanvas!.createImage();
      img.onload = () => {
        imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = (err) => {
        imageCache.delete(src);
        reject(err);
      };
      img.src = src;
    });
  }

  getCachedImage(src: string): CanvasImageLike | null {
    if (!src) return null;
    const cached = imageCache.get(src);
    if (cached && cached.width && cached.height) return cached;
    if (!cached && this.wxCanvas) {
      const img = this.wxCanvas.createImage();
      img.onload = () => {
        imageCache.set(src, img);
        this.renderCallback?.();
      };
      img.onerror = () => {
        imageCache.delete(src);
      };
      img.src = src;
      imageCache.set(src, img);
    }
    return null;
  }

  createCanvasContext(canvas: unknown): CanvasContextLike {
    const wxCanvas = canvas as WxCanvas;
    this.wxCanvas = wxCanvas;
    const ctx = wxCanvas.getContext('2d');
    return new WxCanvasContext(ctx);
  }

  async canvasToDataURL(): Promise<string> {
    throw new Error('canvasToDataURL is not supported on WX. Use canvasToTempFilePath instead.');
  }

  canvasToTempFilePath(canvas: unknown, options: Record<string, unknown> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        ...options,
        success: (res: { tempFilePath: string }) => resolve(res.tempFilePath),
        fail: (err: unknown) => reject(err),
      });
    });
  }
}

/**
 * Fallback text size estimation when no canvas context is available.
 */
function estimateTextSize(options: TextMeasureOptions): { width: number; height: number } {
  const avgCharWidth = options.fontSize * 0.6;
  const lineClamp = normalizeLineClamp(options.lineClamp);
  const lineH = resolveLineHeightPx(options.fontSize, options.lineHeight);
  if (options.whiteSpace === 'nowrap') {
    const width = options.content.replace(/\n/g, ' ').length * avgCharWidth;
    if (lineClamp) {
      return { width: Math.min(width, options.availableWidth), height: lineH };
    }
    return { width, height: lineH };
  }
  const charsPerLine = Math.max(1, Math.floor(options.availableWidth / avgCharWidth));
  const lineCount = Math.ceil(options.content.length / charsPerLine);
  const displayedLineCount = lineClamp ? Math.min(lineCount, lineClamp) : lineCount;
  return {
    width: Math.min(options.content.length * avgCharWidth, options.availableWidth),
    height: displayedLineCount * lineH,
  };
}
