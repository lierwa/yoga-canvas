import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), monacoLocalAssets()],
  ...(command === 'serve'
    ? {
        resolve: {
          alias: {
            '@yoga-canvas/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
          },
        },
      }
    : {}),
}))

function monacoLocalAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const loaderJsPath = require.resolve('monaco-editor/min/vs/loader.js')
  const vsDir = path.dirname(loaderJsPath)

  let outDir = ''

  const copyDir = async (srcDir: string, destDir: string): Promise<void> => {
    await fs.mkdir(destDir, { recursive: true })
    const entries = await fs.readdir(srcDir, { withFileTypes: true })
    await Promise.all(
      entries.map(async (ent) => {
        const src = path.join(srcDir, ent.name)
        const dest = path.join(destDir, ent.name)
        if (ent.isDirectory()) {
          await copyDir(src, dest)
          return
        }
        if (ent.isFile()) {
          await fs.copyFile(src, dest)
        }
      }),
    )
  }

  const contentTypeByExt: Record<string, string> = {
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }

  return {
    name: 'monaco-local-assets',
    configResolved(config) {
      outDir = config.build.outDir
    },
    configureServer(server) {
      server.middlewares.use('/monaco/vs', async (req, res, next) => {
        try {
          const urlPath = decodeURIComponent(req.url ?? '/')
          const rel = urlPath.replace(/^\//, '')
          const filePath = path.join(vsDir, rel)
          if (!filePath.startsWith(vsDir)) {
            res.statusCode = 403
            res.end('Forbidden')
            return
          }

          const stat = await fs.stat(filePath).catch(() => null)
          if (!stat || !stat.isFile()) {
            next()
            return
          }

          const ext = path.extname(filePath).toLowerCase()
          res.setHeader('Content-Type', contentTypeByExt[ext] ?? 'application/octet-stream')
          const buf = await fs.readFile(filePath)
          res.statusCode = 200
          res.end(buf)
        } catch (e) {
          next(e as Error)
        }
      })
    },
    async closeBundle() {
      const dest = path.resolve(process.cwd(), outDir, 'monaco', 'vs')
      await copyDir(vsDir, dest)
    },
  }
}
