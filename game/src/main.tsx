import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

function hideLoadFallback() {
  const fb = document.getElementById('load-fallback')
  if (fb) fb.style.display = 'none'
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err }
  }
  componentDidMount() {
    hideLoadFallback()
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#0c0c0c',
            color: '#fff',
            fontFamily: 'sans-serif',
          }}
        >
          <div>
            <p style={{ color: '#f87171', marginBottom: 8 }}>页面出错</p>
            <pre style={{ fontSize: 12, color: '#aaa', overflow: 'auto', maxHeight: 200 }}>
              {this.state.error.message}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')!
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
)
// Hide "加载中" only after React has painted to avoid black flash
requestAnimationFrame(() => {
  requestAnimationFrame(hideLoadFallback)
})