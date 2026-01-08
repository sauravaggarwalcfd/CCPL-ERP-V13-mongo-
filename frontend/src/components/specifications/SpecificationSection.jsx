import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, Ruler, Package, Factory, Sparkles, Settings, Plus, X, ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react'
import CustomSpecModal from './CustomSpecModal'
import './SpecificationSection.css'

/**
 * SpecificationSection - Professional UI for managing category variant specifications
 *
 * Props:
 * - specifications: current specification state { colour, size, uom, vendor, brand, supplier_group }
 * - setSpecifications: state setter for specifications
 * - variantGroups: available groups { colour: [], size: [], uom: [], vendor: [], brand: [], supplier_group: [] }
 * - customFields: array of custom field configurations
 * - setCustomFields: state setter for custom fields
 * - categoryCode: current category code (for API calls)
 */
export default function SpecificationSection({
  specifications,
  setSpecifications,
  variantGroups,
  customFields,
  setCustomFields,
  categoryCode
}) {
  const navigate = useNavigate()
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    colour: false,
    size: false,
    uom: false,
    supplier: false,
    brand: false,
    custom: false
  })

  // Auto-expand sections that have enabled specifications
  useEffect(() => {
    if (specifications) {
      setExpandedSections({
        colour: specifications.colour?.enabled || false,
        size: specifications.size?.enabled || false,
        uom: specifications.uom?.enabled || false,
        supplier: specifications.supplier_group?.enabled || specifications.vendor?.enabled || false,
        brand: specifications.brand?.enabled || false,
        custom: customFields && customFields.length > 0
      })
    }
  }, [specifications?.colour?.enabled, specifications?.size?.enabled, specifications?.uom?.enabled, specifications?.supplier_group?.enabled, specifications?.vendor?.enabled, specifications?.brand?.enabled, customFields?.length])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleToggleSpec = (specKey, enabled) => {
    setSpecifications(prev => ({
      ...prev,
      [specKey]: {
        ...prev[specKey],
        enabled: enabled,
        required: specKey === 'colour' ? true : prev[specKey]?.required || false,
        groups: enabled ? (prev[specKey]?.groups || []) : []
      }
    }))
  }

  const handleGroupSelect = (specKey, groupCode) => {
    const currentGroups = specifications[specKey]?.groups || []
    let newGroups

    if (currentGroups.includes(groupCode)) {
      newGroups = currentGroups.filter(g => g !== groupCode)
    } else {
      newGroups = [...currentGroups, groupCode]
    }

    setSpecifications(prev => ({
      ...prev,
      [specKey]: {
        ...prev[specKey],
        groups: newGroups
      }
    }))
  }

  const handleAddCustomSpec = (spec) => {
    setCustomFields(prev => [...prev, {
      field_code: spec.spec_code,
      field_name: spec.spec_name,
      field_type: spec.spec_type,
      enabled: true,
      required: spec.is_required || false,
      options: spec.options || [],
      display_order: customFields.length
    }])
  }

  const handleRemoveCustomSpec = (fieldCode) => {
    setCustomFields(prev => prev.filter(f => f.field_code !== fieldCode))
  }

  const renderGroupSelector = (specKey, groups, selectedGroups) => {
    const groupTypePaths = {
      colour: '/variant-master?tab=colours',
      size: '/variant-master?tab=sizes',
      uom: '/variant-master?tab=uoms',
      supplier_group: '/masters/suppliers',
      brand: '/masters/brands'
    };

    const groupTypeNames = {
      colour: 'Colour',
      size: 'Size',
      uom: 'UOM',
      supplier_group: 'Supplier',
      brand: 'Brand'
    };

    if (!groups || groups.length === 0) {
      return (
        <div className="spec-no-groups">
          <p>No groups available. Create groups in Variant/Master.</p>
          {groupTypePaths[specKey] && (
            <button
              type="button"
              onClick={() => navigate(groupTypePaths[specKey])}
              className="spec-add-group-btn"
              style={{ marginTop: '8px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              Add {groupTypeNames[specKey] || specKey} Group
            </button>
          )}
        </div>
      )
    }

    return (
      <div>
        <div className="spec-group-chips">
          {groups.map(group => {
            const isSelected = selectedGroups?.includes(group.group_code || group.code)
            return (
              <button
                key={group.group_code || group.code || group.id}
                type="button"
                onClick={() => handleGroupSelect(specKey, group.group_code || group.code)}
                className={`spec-chip ${isSelected ? 'selected' : ''}`}
              >
                {isSelected && <span className="chip-check">✓</span>}
                {group.group_name || group.name}
              </button>
            )
          })}
        </div>
        {groupTypePaths[specKey] && (
          <button
            type="button"
            onClick={() => navigate(groupTypePaths[specKey])}
            className="spec-add-group-btn"
            style={{ marginTop: '12px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
          >
            <Plus size={16} />
            Add New {groupTypeNames[specKey] || specKey} Group
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="specification-section">
      {/* Colour Group */}
      <div className="spec-group variant-colour">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('colour')}
        >
          <div className="spec-title">
            <Palette size={20} className="spec-icon" />
            <span>Colour Group</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.colour ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.colour && (
          <div className="spec-card">
            <p className="spec-description">
              Select which colour groups are available for items in this category.
            </p>

            <div className="spec-content">
              <label className="spec-toggle">
                <input
                  type="checkbox"
                  checked={specifications.colour?.enabled || false}
                  onChange={(e) => handleToggleSpec('colour', e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable Colour Variants</span>
              </label>

              {specifications.colour?.enabled && (
                <div className="spec-groups-container">
                  <label className="spec-field-label">Select Colour Groups:</label>
                  {renderGroupSelector('colour', variantGroups.colour, specifications.colour?.groups)}

                  {specifications.colour?.groups?.length > 0 && (
                    <div className="spec-selected-count">
                      <span className="count-badge">{specifications.colour.groups.length}</span>
                      group(s) selected
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Size Group */}
      <div className="spec-group variant-size">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('size')}
        >
          <div className="spec-title">
            <Ruler size={20} className="spec-icon" />
            <span>Size Group</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.size ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.size && (
          <div className="spec-card">
            <p className="spec-description">
              Select which size groups are available for items in this category (S, M, L, XL, etc.).
            </p>

            <div className="spec-content">
              <label className="spec-toggle">
                <input
                  type="checkbox"
                  checked={specifications.size?.enabled || false}
                  onChange={(e) => handleToggleSpec('size', e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable Size Variants</span>
              </label>

              {specifications.size?.enabled && (
                <div className="spec-groups-container">
                  <label className="spec-field-label">Select Size Groups:</label>
                  {renderGroupSelector('size', variantGroups.size, specifications.size?.groups)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* UOM Group */}
      <div className="spec-group variant-uom">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('uom')}
        >
          <div className="spec-title">
            <Scale size={20} className="spec-icon" />
            <span>UOM Group</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.uom ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.uom && (
          <div className="spec-card">
            <p className="spec-description">
              Select which unit of measure groups are available for items in this category (PCS, KG, MTR, etc.).
            </p>

            <div className="spec-content">
              <label className="spec-toggle">
                <input
                  type="checkbox"
                  checked={specifications.uom?.enabled || false}
                  onChange={(e) => handleToggleSpec('uom', e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable UOM Variants</span>
              </label>

              {specifications.uom?.enabled && (
                <div className="spec-groups-container">
                  <label className="spec-field-label">Select UOM Groups:</label>
                  {renderGroupSelector('uom', variantGroups.uom, specifications.uom?.groups)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Supplier Group */}
      <div className="spec-group supplier-group">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('supplier')}
        >
          <div className="spec-title">
            <Factory size={20} className="spec-icon" />
            <span>Supplier Group</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.supplier ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.supplier && (
          <div className="spec-card">
            <p className="spec-description">
              Select which supplier groups are valid for items in this category.
            </p>

            <div className="spec-content">
              <label className="spec-toggle">
                <input
                  type="checkbox"
                  checked={specifications.supplier_group?.enabled || false}
                  onChange={(e) => handleToggleSpec('supplier_group', e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable Supplier Group Selection</span>
              </label>

              {specifications.supplier_group?.enabled && (
                <div className="spec-groups-container">
                  <label className="spec-field-label">Select Supplier Groups:</label>
                  {renderGroupSelector('supplier_group', variantGroups.supplier_group, specifications.supplier_group?.groups)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Brand Group */}
      <div className="spec-group brand-group">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('brand')}
        >
          <div className="spec-title">
            <Sparkles size={20} className="spec-icon" />
            <span>Brand Group</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.brand ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.brand && (
          <div className="spec-card">
            <p className="spec-description">
              Select which brand groups are valid for items in this category.
            </p>

            <div className="spec-content">
              <label className="spec-toggle">
                <input
                  type="checkbox"
                  checked={specifications.brand?.enabled || false}
                  onChange={(e) => handleToggleSpec('brand', e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable Brand Group Selection</span>
              </label>

              {specifications.brand?.enabled && (
                <div className="spec-groups-container">
                  <label className="spec-field-label">Select Brand Groups:</label>
                  {renderGroupSelector('brand', variantGroups.brand, specifications.brand?.groups)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Specifications */}
      <div className="spec-group custom-group">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('custom')}
        >
          <div className="spec-title">
            <Settings size={20} className="spec-icon" />
            <span>Custom Specifications</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.custom ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.custom && (
          <div className="spec-card">
            <p className="spec-description">
              Add specialized specifications for this category like Fit Type, Fabric Composition, etc.
            </p>

            <div className="spec-content">
              {customFields.length > 0 && (
                <div className="custom-specs-list">
                  {customFields.map((field, idx) => (
                    <div key={field.field_code || idx} className="custom-spec-item">
                      <div className="custom-spec-info">
                        <span className="custom-spec-name">{field.field_name}</span>
                        <span className="custom-spec-type">{field.field_type}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSpec(field.field_code)}
                        className="custom-spec-remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="btn-add-custom"
              >
                <Plus size={18} />
                Add Custom Specification
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Specification Modal */}
      {showCustomModal && (
        <CustomSpecModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          onAdd={handleAddCustomSpec}
          selectedSpecs={customFields}
          onNavigateToVariant={() => {
            setShowCustomModal(false)
            navigate('/variant-master?tab=attributes')
          }}
        />
      )}
    </div>
  )
}
