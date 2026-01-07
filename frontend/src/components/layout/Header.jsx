import { Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useLayout } from '../../context/LayoutContext'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { title } = useLayout()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-600 hover:text-gray-900 p-2"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">{user?.full_name}</span>
          <button
            onClick={logout}
            className="text-xs sm:text-sm text-red-600 hover:text-red-700 px-2 sm:px-0"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
