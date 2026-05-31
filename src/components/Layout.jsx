import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ToastContainer from './Toast'
import { useAppStore } from '../store'
import { useUI } from '../context/UIContext'
import { useKeyboard } from '../hooks/useKeyboard'

function AppShell({ children }) {
  useKeyboard() // Global keyboard shortcuts — inside Router context

  const { sidebarCollapsed } = useUI()
  const location = useLocation()
  const refresh  = useAppStore(s => s.refresh)

  useEffect(() => { refresh() }, [])

  const marginLeft = sidebarCollapsed ? 'ml-[48px]' : 'ml-[200px]'

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${marginLeft}`}>
        <Header />
        <main className="flex-1 overflow-y-auto pt-12">
          <div key={location.pathname} className="view-enter h-full">
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export default function Layout({ children }) {
  return <AppShell>{children}</AppShell>
}
