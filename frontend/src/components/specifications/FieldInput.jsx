/**
 * FieldInput Component
 * Generic field renderer that supports multiple input types
 */

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useFieldValues } from '../../hooks/useSpecifications';
import { colourApi, sizeApi, uomApi } from '../../services/variantApi';
import { brands, suppliers } from '../../services/api';
import { toast } from 'react-hot-toast';

const FieldInput = ({ field, value, onChange, categoryCode, error, onSaveDraft, specifications }) => {
  const {
    field_key,
    field_name,
    field_type,
    required,
    options: customOptions = [],
    placeholder,
    min_value,
    max_value,
    source
  } = field;

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemData, setNewItemData] = useState({});
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [saving, setSaving] = useState(false);

  // Get pre-selected groups from category configuration
  const getSelectedGroupsFromSpec = () => {
    if (!specifications) return [];
    
    if (field_key === 'colour_code' && specifications.colour?.groups) {
      return specifications.colour.groups;
    } else if (field_key === 'size_code' && specifications.size?.groups) {
      return specifications.size.groups;
    } else if (field_key === 'uom_code' && specifications.uom?.groups) {
      return specifications.uom.groups;
    } else if (field_key === 'vendor_code' && (specifications.supplier_group?.groups || specifications.vendor?.groups)) {
      return specifications.supplier_group?.groups || specifications.vendor?.groups || [];
    } else if (field_key === 'supplier_code' && (specifications.supplier_group?.groups || specifications.vendor?.groups)) {
      return specifications.supplier_group?.groups || specifications.vendor?.groups || [];
    } else if (field_key === 'brand_code' && specifications.brand?.groups) {
      return specifications.brand.groups;
    }
    
    console.log('[SPEC DEBUG] No groups found for field:', field_key, 'specifications:', specifications);
    return [];
  };

  // Log on mount and when specifications change
  useEffect(() => {
    console.log(`[FieldInput] ${field_key} - specifications:`, specifications);
    const groups = getSelectedGroupsFromSpec();
    console.log(`[FieldInput] ${field_key} - extracted groups:`, groups);
  }, [field_key, specifications]);

  // Fetch values for SELECT fields from masters
  const shouldFetchValues = field_type === 'SELECT' && source && categoryCode;
  const { options: fetchedOptions, loading, refetch } = useFieldValues(
    categoryCode,
    field_key,
    shouldFetchValues
  );

  // Determine options to use
  const options = shouldFetchValues ? fetchedOptions : customOptions;

  const handleChange = (e) => {
    const { value: newValue, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : newValue;
    onChange(field_key, finalValue);
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const handleAddNew = () => {
    const preSelectedGroups = getSelectedGroupsFromSpec();
    setSelectedGroups(preSelectedGroups);
    
    // Initialize form based on field type
    if (field_key === 'colour_code') {
      setNewItemData({
        colour_code: '',
        colour_name: '',
        colour_hex: '#000000',
        colour_groups: preSelectedGroups
      });
    } else if (field_key === 'size_code') {
      setNewItemData({
        size_code: '',
        size_name: '',
        size_groups: preSelectedGroups
      });
    } else if (field_key === 'uom_code') {
      setNewItemData({
        uom_code: '',
        uom_name: '',
        uom_symbol: '',
        uom_groups: preSelectedGroups
      });
    } else if (field_key === 'supplier_code') {
      setNewItemData({
        supplier_code: '',
        supplier_name: '',
        supplier_groups: preSelectedGroups
      });
    } else if (field_key === 'brand_code') {
      setNewItemData({
        brand_code: '',
        brand_name: '',
        brand_groups: preSelectedGroups
      });
    }
    
    setShowAddModal(true);
  };

  const handleSaveNew = async () => {
    try {
      setSaving(true);
      let response;
      
      // Create based on field type
      if (field_key === 'colour_code') {
        if (!newItemData.colour_code || !newItemData.colour_name) {
          toast.error('Please fill in colour code and name');
          setSaving(false);
          return;
        }
        if (!newItemData.colour_groups || newItemData.colour_groups.length === 0) {
          toast.error('Please select at least one colour group');
          setSaving(false);
          return;
        }
        response = await colourApi.create({
          ...newItemData,
          colour_group: newItemData.colour_groups[0], // Ensure colour_group is set to first selected group
          rgb_value: hexToRgb(newItemData.colour_hex)
        });
        toast.success('Colour created successfully!');
        onChange(field_key, newItemData.colour_code);
      } else if (field_key === 'size_code') {
        if (!newItemData.size_code || !newItemData.size_name) {
          toast.error('Please fill in size code and name');
          setSaving(false);
          return;
        }
        response = await sizeApi.create(newItemData);
        toast.success('Size created successfully!');
        onChange(field_key, newItemData.size_code);
      } else if (field_key === 'uom_code') {
        if (!newItemData.uom_code || !newItemData.uom_name) {
          toast.error('Please fill in UOM code and name');
          setSaving(false);
          return;
        }
        response = await uomApi.create(newItemData);
        toast.success('UOM created successfully!');
        onChange(field_key, newItemData.uom_code);
      } else if (field_key === 'supplier_code') {
        if (!newItemData.supplier_code || !newItemData.supplier_name) {
          toast.error('Please fill in supplier code and name');
          setSaving(false);
          return;
        }
        response = await suppliers.create(newItemData);
        toast.success('Supplier created successfully!');
        onChange(field_key, newItemData.supplier_code);
      } else if (field_key === 'brand_code') {
        if (!newItemData.brand_code || !newItemData.brand_name) {
          toast.error('Please fill in brand code and name');
          setSaving(false);
          return;
        }
        response = await brands.create(newItemData);
        toast.success('Brand created successfully!');
        onChange(field_key, newItemData.brand_code);
      }
      
      // Refresh options
      if (refetch) refetch();
      
      // Close modal and reset
      setShowAddModal(false);
      setNewItemData({});
      setSelectedGroups([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  const renderAddModal = () => {
    if (!showAddModal) return null;

    const itemType = field_key === 'colour_code' ? 'Colour' :
                     field_key === 'size_code' ? 'Size' :
                     field_key === 'uom_code' ? 'UOM' :
                     field_key === 'supplier_code' ? 'Supplier' :
                     field_key === 'brand_code' ? 'Brand' : 'Item';
    
    const groupNames = selectedGroups.length > 0 
      ? ` in ${selectedGroups.join(', ')}` 
      : '';
    
    const modalTitle = `Add New ${itemType}${groupNames}`;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{modalTitle}</h3>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {field_key === 'colour_code' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Colour Code *</label>
                  <input
                    type="text"
                    value={newItemData.colour_code || ''}
                    onChange={(e) => setNewItemData({...newItemData, colour_code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., RED001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colour Name *</label>
                  <input
                    type="text"
                    value={newItemData.colour_name || ''}
                    onChange={(e) => setNewItemData({...newItemData, colour_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Crimson Red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colour Hex</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newItemData.colour_hex || '#000000'}
                      onChange={(e) => setNewItemData({...newItemData, colour_hex: e.target.value})}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={newItemData.colour_hex || '#000000'}
                      onChange={(e) => setNewItemData({...newItemData, colour_hex: e.target.value})}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </>
            )}

            {field_key === 'size_code' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Size Code *</label>
                  <input
                    type="text"
                    value={newItemData.size_code || ''}
                    onChange={(e) => setNewItemData({...newItemData, size_code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., M, L, XL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Size Name *</label>
                  <input
                    type="text"
                    value={newItemData.size_name || ''}
                    onChange={(e) => setNewItemData({...newItemData, size_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Medium, Large"
                  />
                </div>
              </>
            )}

            {field_key === 'uom_code' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">UOM Code *</label>
                  <input
                    type="text"
                    value={newItemData.uom_code || ''}
                    onChange={(e) => setNewItemData({...newItemData, uom_code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., MTR, KG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">UOM Name *</label>
                  <input
                    type="text"
                    value={newItemData.uom_name || ''}
                    onChange={(e) => setNewItemData({...newItemData, uom_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Meter, Kilogram"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Symbol</label>
                  <input
                    type="text"
                    value={newItemData.uom_symbol || ''}
                    onChange={(e) => setNewItemData({...newItemData, uom_symbol: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., m, kg"
                  />
                </div>
              </>
            )}

            {field_key === 'supplier_code' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Code *</label>
                  <input
                    type="text"
                    value={newItemData.supplier_code || ''}
                    onChange={(e) => setNewItemData({...newItemData, supplier_code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., SUP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    value={newItemData.supplier_name || ''}
                    onChange={(e) => setNewItemData({...newItemData, supplier_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., ABC Textiles"
                  />
                </div>
              </>
            )}

            {field_key === 'brand_code' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Brand Code *</label>
                  <input
                    type="text"
                    value={newItemData.brand_code || ''}
                    onChange={(e) => setNewItemData({...newItemData, brand_code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., NIKE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={newItemData.brand_name || ''}
                    onChange={(e) => setNewItemData({...newItemData, brand_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Nike Inc."
                  />
                </div>
              </>
            )}

            {/* Info message about automatic group assignment */}
            {selectedGroups.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This item will be automatically added to the groups configured for this category: {selectedGroups.join(', ')}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNew}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderField = () => {
    switch (field_type) {
      case 'SELECT':
        // Check if this is a master data field that supports adding new entries
        const canAddNew = ['colour_code', 'size_code', 'uom_code', 'supplier_code', 'brand_code'].includes(field_key);
        
        return (
          <div className="flex gap-2">
            <select
              id={field_key}
              value={value || ''}
              onChange={handleChange}
              required={required}
              disabled={loading}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                {loading ? 'Loading...' : `Select ${field_name}`}
              </option>
              {options.map((option) => {
                // Handle both simple string options and FieldOption objects
                const optionCode = option.code || option;
                const optionName = option.name || option;
                const additionalInfo = option.additional_info || {};

                return (
                  <option key={optionCode} value={optionCode}>
                    {optionName}
                    {additionalInfo.symbol && ` (${additionalInfo.symbol})`}
                  </option>
                );
              })}
            </select>
            {canAddNew && (
              <button
                type="button"
                onClick={handleAddNew}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 flex-shrink-0"
                title={`Add new ${field_name.toLowerCase()}`}
              >
                <Plus size={16} />
                <span className="text-xs">Add New</span>
              </button>
            )}
          </div>
        );

      case 'TEXT':
      case 'TEXTAREA':
        const Component = field_type === 'TEXTAREA' ? 'textarea' : 'input';
        return (
          <Component
            type="text"
            id={field_key}
            value={value || ''}
            onChange={handleChange}
            required={required}
            placeholder={placeholder || `Enter ${field_name}`}
            rows={field_type === 'TEXTAREA' ? 3 : undefined}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            id={field_key}
            value={value || ''}
            onChange={handleChange}
            required={required}
            placeholder={placeholder || `Enter ${field_name}`}
            min={min_value}
            max={max_value}
            step="any"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );

      case 'CHECKBOX':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field_key}
              checked={!!value}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={field_key} className="ml-2 text-sm text-gray-700">
              {field_name}
            </label>
          </div>
        );

      case 'DATE':
        return (
          <input
            type="date"
            id={field_key}
            value={value || ''}
            onChange={handleChange}
            required={required}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );

      default:
        return (
          <input
            type="text"
            id={field_key}
            value={value || ''}
            onChange={handleChange}
            required={required}
            placeholder={placeholder || `Enter ${field_name}`}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
    }
  };

  // Don't render checkbox label separately
  if (field_type === 'CHECKBOX') {
    return (
      <div className="mb-4">
        {renderField()}
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label
        htmlFor={field_key}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {field_name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      {placeholder && field_type !== 'TEXT' && field_type !== 'TEXTAREA' && field_type !== 'NUMBER' && (
        <p className="text-xs text-gray-500 mt-1">{placeholder}</p>
      )}

      {/* Add Item Modal */}
      {renderAddModal()}
    </div>
  );
};

export default FieldInput;
