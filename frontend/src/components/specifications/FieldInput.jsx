/**
 * FieldInput Component
 * Generic field renderer that supports multiple input types
 */

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useFieldValues } from '../../hooks/useSpecifications';
import { colourApi } from '../../services/variantApi';
import { toast } from 'react-hot-toast';

const FieldInput = ({ field, value, onChange, categoryCode, error }) => {
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

  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [newColorData, setNewColorData] = useState({
    colour_code: '',
    colour_name: '',
    colour_hex: '#000000',
    colour_group: 'FABRIC_COLORS'
  });
  const [saving, setSaving] = useState(false);

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

  const handleAddColor = async () => {
    if (!newColorData.colour_code || !newColorData.colour_name) {
      toast.error('Please fill in color code and name');
      return;
    }

    try {
      setSaving(true);
      await colourApi.create({
        ...newColorData,
        colour_groups: [newColorData.colour_group],
        group_name: 'Fabric Colors',
        rgb_value: hexToRgb(newColorData.colour_hex)
      });
      
      toast.success('Color created successfully!');
      setShowAddColorModal(false);
      setNewColorData({
        colour_code: '',
        colour_name: '',
        colour_hex: '#000000',
        colour_group: 'FABRIC_COLORS'
      });
      
      // Refresh color options
      if (refetch) refetch();
      
      // Select the newly created color
      onChange(field_key, newColorData.colour_code);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create color');
    } finally {
      setSaving(false);
    }
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const renderField = () => {
    switch (field_type) {
      case 'SELECT':
        // Check if this is a color field
        const isColorField = field_key === 'colour_code' || source === 'COLOUR_MASTER';
        
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
            {isColorField && (
              <button
                type="button"
                onClick={() => setShowAddColorModal(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                title="Add new color"
              >
                <Plus size={16} />
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

      {/* Add Color Modal */}
      {showAddColorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Color</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newColorData.colour_code}
                  onChange={(e) => setNewColorData(prev => ({ ...prev, colour_code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., RED, BLU"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newColorData.colour_name}
                  onChange={(e) => setNewColorData(prev => ({ ...prev, colour_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Red, Blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Hex
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newColorData.colour_hex}
                    onChange={(e) => setNewColorData(prev => ({ ...prev, colour_hex: e.target.value }))}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newColorData.colour_hex}
                    onChange={(e) => setNewColorData(prev => ({ ...prev, colour_hex: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Group
                </label>
                <select
                  value={newColorData.colour_group}
                  onChange={(e) => setNewColorData(prev => ({ ...prev, colour_group: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FABRIC_COLORS">Fabric Colors</option>
                  <option value="THREAD_COLORS">Thread Colors</option>
                  <option value="BUTTON_COLORS">Button Colors</option>
                  <option value="LABEL_COLORS">Label Colors</option>
                  <option value="OTHER">Other Colors</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddColorModal(false);
                  setNewColorData({
                    colour_code: '',
                    colour_name: '',
                    colour_hex: '#000000',
                    colour_group: 'FABRIC_COLORS'
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddColor}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Color'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldInput;
