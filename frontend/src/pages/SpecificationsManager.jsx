/**
 * Specifications Manager Page
 * Admin interface to configure specifications for item categories
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Save, AlertCircle } from 'lucide-react';
import VariantFieldToggle from '../components/specifications/VariantFieldToggle';
import CustomFieldConfig from '../components/specifications/CustomFieldConfig';
import { specificationApi } from '../services/specificationApi';
import { colourApi, sizeApi, uomApi } from '../services/variantApi';

const SpecificationsManager = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [specifications, setSpecifications] = useState(null);
  const [variantGroups, setVariantGroups] = useState({
    colour: [],
    size: [],
    uom: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
    loadVariantGroups();
  }, []);

  // Load specifications when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadSpecifications();
    } else {
      setSpecifications(null);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      // TODO: Replace with actual category API call
      // For now, using mock data
      setCategories([
        { code: 'THREAD', name: 'Threads' },
        { code: 'FABRIC', name: 'Fabrics' },
        { code: 'BUTTON', name: 'Buttons' },
        { code: 'LABEL', name: 'Labels' },
        { code: 'ZIPPER', name: 'Zippers' }
      ]);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const loadVariantGroups = async () => {
    try {
      const [colourRes, sizeRes, uomRes] = await Promise.all([
        colourApi.getGroups(),
        sizeApi.getGroups(),
        uomApi.getGroups()
      ]);

      setVariantGroups({
        colour: colourRes.data || [],
        size: sizeRes.data || [],
        uom: uomRes.data || []
      });
    } catch (error) {
      console.error('Error loading variant groups:', error);
    }
  };

  const loadSpecifications = async () => {
    try {
      setLoading(true);
      const response = await specificationApi.get(selectedCategory);
      setSpecifications(response.data);
      setHasChanges(false);
    } catch (error) {
      if (error.response?.status === 404) {
        // No specifications configured yet - create default
        setSpecifications({
          category_code: selectedCategory,
          category_name: categories.find(c => c.code === selectedCategory)?.name || selectedCategory,
          category_level: 1,
          specifications: {
            colour: null,
            size: null,
            uom: null,
            vendor: null
          },
          custom_fields: []
        });
        setHasChanges(false);
      } else {
        console.error('Error loading specifications:', error);
        toast.error('Failed to load specifications');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVariantFieldUpdate = (fieldKey, config) => {
    setSpecifications(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [fieldKey]: config
      }
    }));
    setHasChanges(true);
  };

  const handleAddCustomField = (fieldData) => {
    setSpecifications(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, fieldData]
    }));
    setHasChanges(true);
    toast.success('Custom field added');
  };

  const handleUpdateCustomField = (fieldCode, fieldData) => {
    setSpecifications(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.map(field =>
        field.field_code === fieldCode ? fieldData : field
      )
    }));
    setHasChanges(true);
    toast.success('Custom field updated');
  };

  const handleDeleteCustomField = (fieldCode) => {
    if (!confirm(`Are you sure you want to delete the custom field "${fieldCode}"?`)) {
      return;
    }

    setSpecifications(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter(field => field.field_code !== fieldCode)
    }));
    setHasChanges(true);
    toast.success('Custom field deleted');
  };

  const handleSave = async () => {
    if (!specifications) return;

    try {
      setSaving(true);

      // Prepare data for API
      const data = {
        category_code: specifications.category_code,
        category_name: specifications.category_name,
        category_level: specifications.category_level,
        specifications: {},
        custom_fields: specifications.custom_fields
      };

      // Add variant field configurations
      ['colour', 'size', 'uom', 'vendor'].forEach(field => {
        if (specifications.specifications[field]) {
          data.specifications[field] = specifications.specifications[field];
        }
      });

      await specificationApi.createOrUpdate(selectedCategory, data);
      toast.success('Specifications saved successfully');
      setHasChanges(false);
      loadSpecifications(); // Reload to get server state
    } catch (error) {
      console.error('Error saving specifications:', error);
      let message = 'Failed to save specifications';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          message = error.response.data.detail.map(err => err.msg).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        }
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Specifications Manager</h1>
          <p className="text-gray-600 mt-2">
            Configure which variant fields (Colour, Size, UOM, Vendor) and custom fields
            are applicable for each item category
          </p>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Category *
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Select a Category --</option>
            {categories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Configuration Area */}
        {loading ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-gray-500">Loading specifications...</p>
          </div>
        ) : !selectedCategory ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a category to configure its specifications</p>
          </div>
        ) : specifications ? (
          <div className="space-y-6">
            {/* Variant Fields Section */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Variant Fields (Standard)
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Enable or disable standard variant fields for this category.
                Only enabled fields will appear in the Item Master form.
              </p>

              <div className="space-y-4">
                <VariantFieldToggle
                  field="Colour"
                  fieldKey="colour"
                  config={specifications.specifications?.colour}
                  groups={variantGroups.colour}
                  onUpdate={handleVariantFieldUpdate}
                />

                <VariantFieldToggle
                  field="Size"
                  fieldKey="size"
                  config={specifications.specifications?.size}
                  groups={variantGroups.size}
                  onUpdate={handleVariantFieldUpdate}
                />

                <VariantFieldToggle
                  field="UOM (Unit of Measure)"
                  fieldKey="uom"
                  config={specifications.specifications?.uom}
                  groups={variantGroups.uom}
                  onUpdate={handleVariantFieldUpdate}
                />

                <VariantFieldToggle
                  field="Vendor/Brand"
                  fieldKey="vendor"
                  config={specifications.specifications?.vendor}
                  groups={[]}
                  onUpdate={handleVariantFieldUpdate}
                />
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Custom Fields
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Add category-specific custom fields such as Quality Grade, Material, GSM, etc.
              </p>

              <CustomFieldConfig
                customFields={specifications.custom_fields || []}
                onAdd={handleAddCustomField}
                onUpdate={handleUpdateCustomField}
                onDelete={handleDeleteCustomField}
              />
            </div>

            {/* Save Button */}
            <div className="bg-white rounded-lg border p-6 flex items-center justify-between">
              <div>
                {hasChanges && (
                  <p className="text-sm text-orange-600">
                    You have unsaved changes
                  </p>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  saving || !hasChanges
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SpecificationsManager;
