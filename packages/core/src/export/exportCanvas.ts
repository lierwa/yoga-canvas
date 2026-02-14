import type { PlatformAdapter } from '../types';

/**
 * Export the canvas as a data URL (H5).
 */
export async function exportToDataURL(
  adapter: PlatformAdapter,
  canvas: unknown,
  type = 'image/png',
  quality = 1,
): Promise<string> {
  return adapter.canvasToDataURL(canvas, type, quality);
}

/**
 * Export the canvas as a temporary file path (WX mini-program).
 */
export async function exportToTempFilePath(
  adapter: PlatformAdapter,
  canvas: unknown,
  options?: Record<string, unknown>,
): Promise<string> {
  if (!adapter.canvasToTempFilePath) {
    throw new Error(`canvasToTempFilePath is not supported on platform "${adapter.name}".`);
  }
  return adapter.canvasToTempFilePath(canvas, options);
}
