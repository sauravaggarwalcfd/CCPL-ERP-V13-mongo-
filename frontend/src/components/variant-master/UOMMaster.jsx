/**
 * UOM Master Component
 * Manages UOM variants - simplified without grouping
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, Calculator, X } from 'lucide-react';
import { uomApi } from '../../services/variantApi';
import UOMForm from './UOMForm';
import UOMConverter from './UOMConverter';

const UOMMaster = () => {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [editingUOM, setEditingUOM] = useState(null);

  // Load UOMs
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const uomsRes = await uomApi.list({ is_active: true });
      setUoms(uomsRes.data || []);
    } catch (error) {
      console.error('Error loading UOMs:', error);
      toast.error('Failed to load UOMs');
    } finally {
      setLoading(false);
    }
  };

  // Filter UOMs by search term
  const filteredUOMs = uoms.filter(
    (uom) =>
      uom.uom_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      uom.uom_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      uom.uom_symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditingUOM(null);
    setShowForm(true);
  };

  const handleEdit = (uom) => {
    setEditingUOM(uom);
    setShowForm(true);
  };

  const handleDelete = async (uom) => {
    if (!confirm(`Are you sure you want to delete UOM "${uom.uom_name}"?`)) {
      return;
    }

    try {
      await uomApi.delete(uom.uom_code);
      toast.success('UOM deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting UOM:', error);
      let message = 'Failed to delete UOM';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          message = error.response.data.detail.map((err) => err.msg).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        }
      }
      toast.error(message);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingUOM) {
        // Remove uom_code from update payload - it's not allowed in updates
        const { uom_code, ...updateData } = data;
        await uomApi.update(editingUOM.uom_code, updateData);
        toast.success('UOM updated successfully');
      } else {
        await uomApi.create(data);
        toast.success('UOM created successfully');
      }
      setShowForm(false);
      setEditingUOM(null);
      loadData();
    } catch (error) {
      console.error('Error saving UOM:', error);
      console.error('Error response:', error.response?.data);
      let message = 'Failed to save UOM';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          message = error.response.data.detail.map((err) => err.msg || err.message || JSON.stringify(err)).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        } else if (typeof error.response.data.detail === 'object') {
          message = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        message = error.message;
      }
      toast.error(message);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingUOM(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search UOMs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConverter(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Calculator className="w-5 h-5" />
            Converter
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add UOM
          </button>
        </div>
      </div>

      {/* UOM List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading UOMs...</div>
      ) : filteredUOMs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No UOMs found</div>
          <p className="text-gray-500 text-sm">
            {searchTerm ? 'Try a different search term' : 'Click "Add UOM" to create your first UOM'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUOMs.map((uom) => (
            <div
              key={uom.uom_code}
              className="bg-white rounded-lg border hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{uom.uom_name}</span>
                    <span className="text-sm px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                      {uom.uom_symbol}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Code: {uom.uom_code}
                  </div>
                  {uom.description && (
                    <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {uom.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    {uom.is_base_uom && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Base Unit
                      </span>
                    )}
                    {uom.conversion_to_base !== 1 && (
                      <span className="text-gray-500">
                        Conv: {uom.conversion_to_base}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(uom)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(uom)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && filteredUOMs.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredUOMs.length} of {uoms.length} UOMs
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <UOMForm
          uom={editingUOM}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Converter Modal */}
      {showConverter && (
        <UOMConverter uoms={uoms} onClose={() => setShowConverter(false)} />
      )}
    </div>
  );
};

export default UOMMaster;
