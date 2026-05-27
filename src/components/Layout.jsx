import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAppStore } from '../store'

export default function Layout({ children }) {
  const refresh = useAppStore(s => s.refresh)

  // Initial data load on mount
  useEffect(() => { refresh() }, [])

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-[200px]">
        <Header />
        <main className="flex-1 overflow-y-auto pt-12">
          {children}
        </main>
      </div>
    </div>
  )
}
