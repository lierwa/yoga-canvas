/**
 * Abstract image-like object that can be drawn on canvas.
 */
export interface CanvasImageLike {
  width: number;
  height: number;
}

/**
 * Options for text measurement.
 */
export interface TextMeasureOptions {
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontFamily: string;
  lineHeight: number;
  availableWidth: number;
  whiteSpace: 'normal' | 'nowrap';
  lineClamp?: number;
}

export interface CanvasGradientLike {
  addColorStop(offset: number, color: string): void;
}

/**
 * Abstract canvas context interface that unifies H5 and WX mini-program APIs.
 */
export interface CanvasContextLike {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(sx: number, sy: number): void;
  rotate(angle: number): void;
  clip(): void;

  // Path
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  rect(x: number, y: number, w: number, h: number): void;

  // Fill & Stroke
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;

  // Style
  setFillStyle(style: string | CanvasGradientLike): void;
  setStrokeStyle(style: string | CanvasGradientLike): void;
  setLineWidth(width: number): void;
  setLineDash(segments: number[]): void;
  setGlobalAlpha(alpha: number): void;
  setShadow(color: string, blur: number, offsetX: number, offsetY: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike;

  // Text
  setFont(font: string): void;
  setTextAlign(align: 'left' | 'center' | 'right'): void;
  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic'): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };

  // Image
  drawImage(image: CanvasImageLike, dx: number, dy: number, dw: number, dh: number): void;
}

/**
 * Platform adapter interface — implemented per platform (H5, WX, etc.).
 */
export interface PlatformAdapter {
  /** Unique platform identifier. */
  name: string;

  /** Measure text dimensions for layout calculation. */
  measureText(options: TextMeasureOptions): { width: number; height: number };

  /** Load an image from a URL, returning a canvas-drawable image. */
  loadImage(src: string): Promise<CanvasImageLike>;

  /** Wrap a native canvas context into the abstract interface. */
  createCanvasContext(canvas: unknown): CanvasContextLike;

  /** Export canvas to a data URL (H5). */
  canvasToDataURL(canvas: unknown, type?: string, quality?: number): Promise<string>;

  /** Export canvas to a temporary file path (WX mini-program). */
  canvasToTempFilePath?(canvas: unknown, options?: Record<string, unknown>): Promise<string>;
}
