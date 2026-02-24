import type {
  PlatformAdapter,
  CanvasImageLike,
  CanvasContextLike,
  TextMeasureOptions,
} from '../types';

/**
 * WeChat mini-program canvas context wrapper implementing CanvasContextLike.
 * Expects a WX Canvas 2D context (wx.createCanvasContext is deprecated;
 * this targets the newer Canvas.getContext('2d') API).
 */
class WxCanvasContext implements CanvasContextLike {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  save(): void { this.ctx.save(); }
  restore(): void { this.ctx.restore(); }
  translate(x: number, y: number): void { this.ctx.translate(x, y); }
  scale(sx: number, sy: number): void { this.ctx.scale(sx, sy); }
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

  setFillStyle(style: string): void { this.ctx.fillStyle = style; }
  setStrokeStyle(style: string): void { this.ctx.strokeStyle = style; }
  setLineWidth(width: number): void { this.ctx.lineWidth = width; }
  setLineDash(segments: number[]): void { this.ctx.setLineDash(segments); }
  setGlobalAlpha(alpha: number): void { this.ctx.globalAlpha = alpha; }

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
    return this.ctx.measureText(text);
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

declare const wx: {
  canvasToTempFilePath(options: Record<string, unknown>): void;
};

/**
 * WeChat mini-program platform adapter.
 */
export class WxAdapter implements PlatformAdapter {
  name = 'wx';

  private wxCanvas: WxCanvas | null = null;

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

    ctx.font = `${options.fontWeight === 'bold' ? 'bold ' : ''}${options.fontSize}px ${options.fontFamily || 'sans-serif'}`;
    const lineH = options.fontSize * options.lineHeight;
    const chars = options.content.split('');
    let currentLineWidth = 0;
    let maxLineWidth = 0;
    let lineCount = 1;

    if (options.whiteSpace === 'nowrap') {
      const singleLine = options.content.replace(/\n/g, ' ');
      const width = ctx.measureText(singleLine).width;
      return { width, height: lineH };
    }

    for (const char of chars) {
      if (char === '\n') {
        maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        lineCount++;
        currentLineWidth = 0;
        continue;
      }
      const charWidth = ctx.measureText(char).width;
      if (currentLineWidth + charWidth > options.availableWidth && currentLineWidth > 0) {
        maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        lineCount++;
        currentLineWidth = charWidth;
      } else {
        currentLineWidth += charWidth;
      }
    }

    return {
      width: Math.min(Math.max(maxLineWidth, currentLineWidth), options.availableWidth),
      height: lineCount * lineH,
    };
  }

  loadImage(src: string): Promise<CanvasImageLike> {
    if (!this.wxCanvas) {
      return Promise.reject(new Error('WX canvas not set. Call setCanvas() first.'));
    }
    return new Promise((resolve, reject) => {
      const img = this.wxCanvas!.createImage();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
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
  if (options.whiteSpace === 'nowrap') {
    const width = options.content.replace(/\n/g, ' ').length * avgCharWidth;
    return { width, height: options.fontSize * options.lineHeight };
  }
  const charsPerLine = Math.max(1, Math.floor(options.availableWidth / avgCharWidth));
  const lineCount = Math.ceil(options.content.length / charsPerLine);
  const lineH = options.fontSize * options.lineHeight;
  return {
    width: Math.min(options.content.length * avgCharWidth, options.availableWidth),
    height: lineCount * lineH,
  };
}
