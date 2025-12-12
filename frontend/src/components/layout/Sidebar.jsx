import { Link } from 'react-router-dom'
import { BarChart3, Package, TrendingUp, ShoppingCart, Users, Truck, GitBranch, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Sidebar() {
  const { logout } = useAuth()

  const navItems = [
    { to: '/', icon: BarChart3, label: 'Dashboard' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/inventory', icon: TrendingUp, label: 'Inventory' },
    { 
      label: 'Purchasing', 
      items: [
        { to: '/suppliers', label: 'Suppliers' },
        { to: '/purchase-orders', label: 'Purchase Orders' },
      ]
    },
    { 
      label: 'Sales', 
      items: [
        { to: '/customers', label: 'Customers' },
        { to: '/sale-orders', label: 'Sale Orders' },
      ]
    },
    { 
      label: 'Operations', 
      items: [
        { to: '/transfers', label: 'Transfers' },
        { to: '/adjustments', label: 'Adjustments' },
      ]
    },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ]

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold">Inventory ERP</h2>
        <p className="text-xs text-gray-400 mt-1">v1.0.0</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {navItems.map((item, idx) => 
          item.items ? (
            <div key={idx}>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">{item.label}</p>
              {item.items.map((subitem, sidx) => (
                <Link 
                  key={sidx}
                  to={subitem.to} 
                  className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm"
                >
                  {subitem.label}
                </Link>
              ))}
            </div>
          ) : (
            <Link 
              key={idx}
              to={item.to} 
              className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-800 transition gap-2"
            >
              {item.icon && <item.icon size={20} />}
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm rounded-lg hover:bg-gray-800 transition text-red-400"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
