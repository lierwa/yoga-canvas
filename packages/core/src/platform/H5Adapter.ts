import type {
  PlatformAdapter,
  CanvasImageLike,
  CanvasContextLike,
  CanvasGradientLike,
  TextMeasureOptions,
} from '../types';

/**
 * H5 (browser) canvas context wrapper implementing CanvasContextLike.
 */
class H5CanvasContext implements CanvasContextLike {
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

  setFillStyle(style: string | CanvasGradientLike): void { this.ctx.fillStyle = style as CanvasFillStrokeStyles['fillStyle']; }
  setStrokeStyle(style: string | CanvasGradientLike): void { this.ctx.strokeStyle = style as CanvasFillStrokeStyles['strokeStyle']; }
  setLineWidth(width: number): void { this.ctx.lineWidth = width; }
  setLineDash(segments: number[]): void { this.ctx.setLineDash(segments); }
  setGlobalAlpha(alpha: number): void { this.ctx.globalAlpha = alpha; }
  setShadow(color: string, blur: number, offsetX: number, offsetY: number): void {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur;
    this.ctx.shadowOffsetX = offsetX;
    this.ctx.shadowOffsetY = offsetY;
  }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike {
    return this.ctx.createLinearGradient(x0, y0, x1, y1);
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
    return this.ctx.measureText(text);
  }

  drawImage(image: CanvasImageLike, dx: number, dy: number, dw: number, dh: number): void {
    this.ctx.drawImage(image as CanvasImageSource, dx, dy, dw, dh);
  }
}

// Offscreen div for text measurement
let measureDiv: HTMLDivElement | null = null;

function getMeasureDiv(): HTMLDivElement {
  if (!measureDiv) {
    measureDiv = document.createElement('div');
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.pointerEvents = 'none';
    measureDiv.style.left = '-9999px';
    measureDiv.style.top = '-9999px';
    measureDiv.style.whiteSpace = 'pre-wrap';
    measureDiv.style.wordBreak = 'break-word';
    measureDiv.style.boxSizing = 'content-box';
    measureDiv.style.padding = '0';
    document.body.appendChild(measureDiv);
  }
  return measureDiv;
}

// Image cache
const imageCache = new Map<string, HTMLImageElement>();

/**
 * H5 (browser) platform adapter.
 */
export class H5Adapter implements PlatformAdapter {
  name = 'h5';

  private renderCallback: (() => void) | null = null;

  /** Set a callback that fires when an image finishes loading. */
  setRenderCallback(cb: (() => void) | null): void {
    this.renderCallback = cb;
  }

  measureText(options: TextMeasureOptions): { width: number; height: number } {
    const div = getMeasureDiv();
    div.style.fontSize = `${options.fontSize}px`;
    div.style.fontWeight = typeof options.fontWeight === 'number' ? `${options.fontWeight}` : options.fontWeight;
    div.style.fontStyle = options.fontStyle;
    div.style.fontFamily = options.fontFamily || 'sans-serif';
    div.style.lineHeight = `${options.lineHeight}`;
    div.textContent = options.content;

    if (options.whiteSpace === 'nowrap') {
      div.style.whiteSpace = 'nowrap';
      div.style.wordBreak = 'normal';
      div.style.width = 'auto';
      div.style.maxWidth = 'none';
      return { width: div.scrollWidth, height: div.offsetHeight };
    }

    div.style.whiteSpace = 'pre-wrap';
    div.style.wordBreak = 'break-word';
    div.style.width = `${options.availableWidth}px`;
    div.style.maxWidth = 'none';
    const width = Math.min(div.scrollWidth, options.availableWidth);
    return { width, height: div.offsetHeight };
  }

  loadImage(src: string): Promise<CanvasImageLike> {
    const cached = imageCache.get(src);
    if (cached && cached.complete) {
      return Promise.resolve(cached);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  /**
   * Get a cached image synchronously (returns null if not loaded yet).
   * Starts loading if not in cache.
   */
  getCachedImage(src: string): CanvasImageLike | null {
    if (!src) return null;
    const cached = imageCache.get(src);
    if (cached && cached.complete) return cached;
    if (!cached) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.set(src, img);
        this.renderCallback?.();
      };
      img.src = src;
      imageCache.set(src, img);
    }
    return null;
  }

  createCanvasContext(canvas: unknown): CanvasContextLike {
    const el = canvas as HTMLCanvasElement;
    const ctx = el.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context from canvas element');
    return new H5CanvasContext(ctx);
  }

  async canvasToDataURL(canvas: unknown, type = 'image/png', quality = 1): Promise<string> {
    return (canvas as HTMLCanvasElement).toDataURL(type, quality);
  }
}
