import React from 'react'
import ReactDOM from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import App from './App'
import './index.css'

const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
const normalizedBase = base.endsWith('/') ? base : `${base}/`
loader.config({ paths: { vs: `${normalizedBase}monaco/vs` } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
