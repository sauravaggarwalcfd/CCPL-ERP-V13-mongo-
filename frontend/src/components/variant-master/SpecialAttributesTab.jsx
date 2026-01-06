/**
 * SpecialAttributesTab - Tab component for managing special attributes
 * Integrated into Variant Master for unified variant management
 */

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, List, FileText, Hash, CheckSquare, X, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const SpecialAttributesTab = () => {
  const [customSpecs, setCustomSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    spec_code: '',
    spec_name: '',
    spec_type: 'DROPDOWN',
    description: '',
    options: [],
    is_mandatory: false
  });
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    fetchSpecifications();
  }, []);

  const fetchSpecifications = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await axiosInstance.get('/api/specifications/custom-specifications')
      // setCustomSpecs(response.data)

      // Mock data for demonstration
      setTimeout(() => {
        setCustomSpecs([
          {
            _id: '1',
            spec_code: 'FIT_TYPE',
            spec_name: 'Fit Type',
            spec_type: 'DROPDOWN',
            description: 'Garment fit style',
            options: [
              { code: 'SLIM', value: 'Slim Fit', is_active: true },
              { code: 'REGULAR', value: 'Regular Fit', is_active: true },
              { code: 'LOOSE', value: 'Loose Fit', is_active: true }
            ],
            is_mandatory: false,
            is_active: true,
            created_date: new Date().toISOString()
          },
          {
            _id: '2',
            spec_code: 'FABRIC_COMP',
            spec_name: 'Fabric Composition',
            spec_type: 'TEXT',
            description: 'Material composition percentage (e.g., 100% Cotton)',
            options: [],
            is_mandatory: false,
            is_active: true,
            created_date: new Date().toISOString()
          },
          {
            _id: '3',
            spec_code: 'WASH_CARE',
            spec_name: 'Wash Care',
            spec_type: 'DROPDOWN',
            description: 'Washing and care instructions',
            options: [
              { code: 'MACHINE', value: 'Machine Wash', is_active: true },
              { code: 'HAND', value: 'Hand Wash Only', is_active: true },
              { code: 'DRY', value: 'Dry Clean Only', is_active: true }
            ],
            is_mandatory: false,
            is_active: true,
            created_date: new Date().toISOString()
          },
          {
            _id: '4',
            spec_code: 'SLEEVE_LEN',
            spec_name: 'Sleeve Length',
            spec_type: 'DROPDOWN',
            description: 'Length of sleeves for tops',
            options: [
              { code: 'FULL', value: 'Full Sleeve', is_active: true },
              { code: 'HALF', value: 'Half Sleeve', is_active: true },
              { code: 'SHORT', value: 'Short Sleeve', is_active: true },
              { code: 'SLEEVELESS', value: 'Sleeveless', is_active: true }
            ],
            is_mandatory: false,
            is_active: true,
            created_date: new Date().toISOString()
          },
          {
            _id: '5',
            spec_code: 'GSM',
            spec_name: 'GSM (Fabric Weight)',
            spec_type: 'NUMBER',
            description: 'Grams per square meter',
            options: [],
            is_mandatory: false,
            is_active: true,
            created_date: new Date().toISOString()
          }
        ]);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching specifications:', error);
      toast.error('Failed to load specifications');
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingSpec(null);
    setFormData({
      spec_code: '',
      spec_name: '',
      spec_type: 'DROPDOWN',
      description: '',
      options: [],
      is_mandatory: false
    });
    setShowForm(true);
  };

  const handleEdit = (spec) => {
    setEditingSpec(spec);
    setFormData({
      spec_code: spec.spec_code,
      spec_name: spec.spec_name,
      spec_type: spec.spec_type,
      description: spec.description || '',
      options: spec.options || [],
      is_mandatory: spec.is_mandatory || false
    });
    setShowForm(true);
  };

  const handleDelete = async (spec) => {
    if (!window.confirm(`Are you sure you want to delete "${spec.spec_name}"?`)) {
      return;
    }

    try {
      setCustomSpecs(prev => prev.filter(s => s._id !== spec._id));
      toast.success('Specification deleted successfully');
    } catch (error) {
      console.error('Error deleting specification:', error);
      toast.error('Failed to delete specification');
    }
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;

    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        {
          code: `OPT_${Date.now()}`,
          value: newOption.trim(),
          is_active: true
        }
      ]
    }));
    setNewOption('');
  };

  const handleRemoveOption = (code) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt.code !== code)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.spec_code || !formData.spec_name) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingSpec) {
        setCustomSpecs(prev => prev.map(s =>
          s._id === editingSpec._id
            ? { ...s, ...formData }
            : s
        ));
        toast.success('Specification updated successfully');
      } else {
        const newSpec = {
          _id: `new_${Date.now()}`,
          ...formData,
          is_active: true,
          created_date: new Date().toISOString()
        };
        setCustomSpecs(prev => [...prev, newSpec]);
        toast.success('Specification created successfully');
      }

      setShowForm(false);
      setEditingSpec(null);
    } catch (error) {
      console.error('Error saving specification:', error);
      toast.error('Failed to save specification');
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'DROPDOWN':
        return <List size={18} className="text-indigo-500" />;
      case 'TEXT':
        return <FileText size={18} className="text-emerald-500" />;
      case 'NUMBER':
        return <Hash size={18} className="text-amber-500" />;
      case 'CHECKBOX':
        return <CheckSquare size={18} className="text-blue-500" />;
      default:
        return <Settings size={18} className="text-gray-500" />;
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'DROPDOWN':
        return 'bg-indigo-100 text-indigo-700';
      case 'TEXT':
        return 'bg-emerald-100 text-emerald-700';
      case 'NUMBER':
        return 'bg-amber-100 text-amber-700';
      case 'CHECKBOX':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Special Attributes</h2>
            <p className="text-sm text-gray-500">Manage custom specifications for item categories</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSpecifications}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create New Specification
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-500">Loading specifications...</span>
        </div>
      ) : customSpecs.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Special Attributes Yet</h3>
          <p className="text-gray-500 mb-4">Create custom specifications to use across item categories</p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            Create First Specification
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {customSpecs.map(spec => (
            <div
              key={spec._id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${spec.is_active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    {getTypeIcon(spec.spec_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{spec.spec_name}</h3>
                    <span className="text-xs text-gray-400 font-mono">{spec.spec_code}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(spec.spec_type)}`}>
                  {spec.spec_type}
                </span>
              </div>

              {/* Description */}
              {spec.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{spec.description}</p>
              )}

              {/* Options */}
              {spec.options && spec.options.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Options ({spec.options.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {spec.options.slice(0, 4).map(opt => (
                      <span
                        key={opt.code}
                        className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full"
                      >
                        {opt.value}
                      </span>
                    ))}
                    {spec.options.length > 4 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                        +{spec.options.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${spec.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {spec.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(spec)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(spec)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-lg font-bold text-white">
                {editingSpec ? 'Edit Specification' : 'Create New Specification'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Spec Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specification Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.spec_code}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    spec_code: e.target.value.toUpperCase().replace(/\s+/g, '_')
                  }))}
                  placeholder="e.g., FIT_TYPE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={editingSpec !== null}
                />
                <p className="text-xs text-gray-400 mt-1">Unique identifier (no spaces, auto-uppercase)</p>
              </div>

              {/* Spec Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specification Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.spec_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, spec_name: e.target.value }))}
                  placeholder="e.g., Fit Type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Spec Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Type
                </label>
                <select
                  value={formData.spec_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, spec_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DROPDOWN">Dropdown (Select)</option>
                  <option value="TEXT">Text Input</option>
                  <option value="NUMBER">Number Input</option>
                  <option value="CHECKBOX">Checkbox (Yes/No)</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this specification"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Options (for DROPDOWN type) */}
              {formData.spec_type === 'DROPDOWN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add new option"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {formData.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                      {formData.options.map(opt => (
                        <span
                          key={opt.code}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-full text-sm"
                        >
                          {opt.value}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.code)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_mandatory" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Required field (mandatory for items)
                </label>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingSpec ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialAttributesTab;
