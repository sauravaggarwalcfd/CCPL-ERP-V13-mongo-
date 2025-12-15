import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProductsList from './pages/products/ProductsList'
import InventoryList from './pages/inventory/InventoryList'
import SuppliersList from './pages/suppliers/SuppliersList'
import ItemMaster from './pages/ItemMaster'
import ItemCategory from './pages/ItemCategory'
import ItemCategoryHierarchy from './pages/ItemCategoryHierarchy'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" />
  
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<MainLayout />}>
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute>
                <ProductsList />
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute>
                <InventoryList />
              </ProtectedRoute>
            } />
            <Route path="/suppliers" element={
              <ProtectedRoute>
                <SuppliersList />
              </ProtectedRoute>
            } />
            <Route path="/item-master" element={
              <ProtectedRoute>
                <ItemMaster />
              </ProtectedRoute>
            } />
            <Route path="/item-category" element={
              <ProtectedRoute>
                <ItemCategory />
              </ProtectedRoute>
            } />
            <Route path="/item-category-hierarchy" element={
              <ProtectedRoute>
                <ItemCategoryHierarchy />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  )
}

export default App
