/**
 * Colour Form Component
 * Form for creating/editing colours with hex picker
 * Supports multiple colour groups
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ColourForm = ({ colour, groups, onSubmit, onCancel, initialGroup }) => {
  const [formData, setFormData] = useState({
    colour_code: '',
    colour_name: '',
    colour_hex: '#000000',
    colour_group: '',  // Legacy single group (for backward compatibility)
    colour_groups: [], // Multiple groups
    description: '',
    display_order: 0,
  });

  useEffect(() => {
    if (colour) {
      // Get colour_groups from existing data, or derive from colour_group
      let colourGroups = colour.colour_groups || [];
      if (colourGroups.length === 0 && colour.colour_group) {
        colourGroups = [colour.colour_group];
      }
      
      setFormData({
        colour_code: colour.colour_code || '',
        colour_name: colour.colour_name || '',
        colour_hex: colour.colour_hex || '#000000',
        colour_group: colour.colour_group || '',
        colour_groups: colourGroups,
        description: colour.description || '',
        display_order: colour.display_order || 0,
      });
    } else if (initialGroup) {
      // Pre-select the initial group when creating new colour for a group
      setFormData(prev => ({
        ...prev,
        colour_groups: [initialGroup],
        colour_group: initialGroup,
      }));
    }
  }, [colour, initialGroup]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleGroup = (groupCode) => {
    setFormData(prev => {
      const currentGroups = prev.colour_groups || [];
      let newGroups;
      
      if (currentGroups.includes(groupCode)) {
        newGroups = currentGroups.filter(g => g !== groupCode);
      } else {
        newGroups = [...currentGroups, groupCode];
      }
      
      return {
        ...prev,
        colour_groups: newGroups,
        colour_group: newGroups[0] || '', // Keep legacy field in sync
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure colour_groups is set
    const submitData = {
      ...formData,
      colour_groups: formData.colour_groups.length > 0 
        ? formData.colour_groups 
        : (formData.colour_group ? [formData.colour_group] : []),
    };
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {colour ? 'Edit Colour' : 'Add New Colour'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Colour Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colour Code *
            </label>
            <input
              type="text"
              name="colour_code"
              value={formData.colour_code}
              onChange={handleChange}
              disabled={!!colour}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="e.g., FAB-RED"
            />
          </div>

          {/* Colour Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colour Name *
            </label>
            <input
              type="text"
              name="colour_name"
              value={formData.colour_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Red"
            />
          </div>

          {/* Colour Hex with Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hex Colour *
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                name="colour_hex"
                value={formData.colour_hex}
                onChange={handleChange}
                className="w-16 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                name="colour_hex"
                value={formData.colour_hex}
                onChange={handleChange}
                required
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#RRGGBB"
              />
            </div>
          </div>

          {/* Colour Groups - Multi-select chip style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colour Groups * <span className="text-xs text-gray-500">(Select one or more)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => {
                const isSelected = formData.colour_groups?.includes(group.code);
                return (
                  <button
                    key={group.code}
                    type="button"
                    onClick={() => toggleGroup(group.code)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {group.name}
                    {isSelected && <span className="ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
            {formData.colour_groups?.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Please select at least one group</p>
            )}
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              name="display_order"
              value={formData.display_order}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional description"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.colour_groups || formData.colour_groups.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {colour ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColourForm;
