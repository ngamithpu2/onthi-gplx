import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Automatically unregister stale service workers and clear browser storage cache
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => undefined)
    }
  }).catch(() => undefined)
}

if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((keys) => {
    for (const key of keys) {
      caches.delete(key).catch(() => undefined)
    }
  }).catch(() => undefined)
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#8C1D23' }}>Đã xảy ra sự cố hiển thị</h2>
          <p style={{ margin: '12px 0 20px', color: '#4B564C' }}>
            Hệ thống đang tải lại giao diện mặc định. Vui lòng bấm nút bên dưới để khôi phục:
          </p>
          <button
            onClick={() => {
              try {
                localStorage.clear()
              } catch {}
              window.location.reload()
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#232F28',
              color: '#FBFAF5',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Làm mới trang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
