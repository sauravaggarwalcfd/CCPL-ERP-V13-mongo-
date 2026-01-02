import { useState, useEffect } from 'react'
import { Receipt, Plus, CreditCard, Search, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function VendorBills() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')

  useEffect(() => {
    fetchBills()
  }, [statusFilter])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter

      const response = await api.get('/purchase/vendor-bills', { params })
      setBills(response.data || [])
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast.error('Failed to load vendor bills')
    } finally {
      setLoading(false)
    }
  }

  const openPaymentModal = (bill) => {
    setSelectedBill(bill)
    setPaymentAmount(bill.pending_amount?.toString() || '')
    setPaymentReference('')
    setShowPaymentModal(true)
  }

  const handlePayment = async () => {
    if (!selectedBill) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (amount > selectedBill.pending_amount) {
      toast.error('Payment amount exceeds pending amount')
      return
    }

    try {
      await api.post(`/purchase/vendor-bills/${selectedBill.bill_code}/payment`, {
        amount,
        reference: paymentReference,
        method: paymentMethod
      })
      toast.success('Payment recorded successfully')
      setShowPaymentModal(false)
      setSelectedBill(null)
      fetchBills()
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error(error.response?.data?.detail || 'Failed to record payment')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-red-100 text-red-800',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const filteredBills = bills.filter(bill =>
    bill.bill_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Bills</h1>
            <p className="text-sm text-gray-500">Manage vendor invoices and payments</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by bill code, vendor, or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>
          <button
            onClick={fetchBills}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No vendor bills found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bill Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pending</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-purple-600">{bill.bill_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{bill.vendor_name}</p>
                      <p className="text-xs text-gray-500">{bill.vendor_code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{bill.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.total_amount || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${bill.pending_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.pending_amount || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(bill.status)}`}>
                      {bill.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {bill.due_date && isOverdue(bill.due_date) && bill.status !== 'PAID' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`${isOverdue(bill.due_date) && bill.status !== 'PAID' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {bill.status !== 'PAID' && (
                        <button
                          onClick={() => openPaymentModal(bill)}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition"
                          title="Record Payment"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-purple-600 text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">Record Payment</h2>
              <p className="text-sm opacity-80">Bill: {selectedBill.bill_code}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(selectedBill.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Paid Amount:</span>
                  <span className="font-semibold text-green-600">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(selectedBill.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Amount:</span>
                  <span className="font-semibold text-red-600">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(selectedBill.pending_amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedBill.pending_amount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference / Transaction ID</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter reference number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedBill(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
