import { useState, useEffect } from 'react'
import { Palette, Ruler, Package, Factory, Sparkles, Settings, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import CustomSpecModal from './CustomSpecModal'
import './SpecificationSection.css'

/**
 * SpecificationSection - Professional UI for managing category variant specifications
 *
 * Props:
 * - specifications: current specification state { colour, size, uom, vendor }
 * - setSpecifications: state setter for specifications
 * - variantGroups: available groups { colour: [], size: [], uom: [], vendor: [] }
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
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    colour: true,
    sizeUom: true,
    supplier: true,
    brand: false,
    custom: true
  })

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

    // Special handling for Size/UOM mutual exclusivity
    if (specKey === 'size' && enabled) {
      setSpecifications(prev => ({
        ...prev,
        uom: { enabled: false, required: false, groups: [] }
      }))
    } else if (specKey === 'uom' && enabled) {
      setSpecifications(prev => ({
        ...prev,
        size: { enabled: false, required: false, groups: [] }
      }))
    }
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
    if (!groups || groups.length === 0) {
      return (
        <div className="spec-no-groups">
          No groups available. Create groups in Variant Master.
        </div>
      )
    }

    return (
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
    )
  }

  return (
    <div className="specification-section">
      {/* Header */}
      <div className="spec-header">
        <div className="spec-header-icon">
          <Settings size={24} />
        </div>
        <div className="spec-header-text">
          <h2>Variant Specifications</h2>
          <p>Configure variant attributes for items in this category</p>
        </div>
      </div>

      {/* Variant 1: Colour Group - MANDATORY */}
      <div className="spec-group variant-colour">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('colour')}
        >
          <div className="spec-badge variant-1">Variant 1</div>
          <div className="spec-title">
            <Palette size={20} className="spec-icon" />
            <span>Colour Group</span>
            <span className="mandatory-badge">MANDATORY</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.colour ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.colour && (
          <div className="spec-card">
            <p className="spec-description">
              Select which colour groups are available for items in this category.
              At least one colour group is required for variant generation.
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

      {/* Variant 2: Size / UOM */}
      <div className="spec-group variant-size-uom">
        <div
          className="spec-group-header"
          onClick={() => toggleSection('sizeUom')}
        >
          <div className="spec-badge variant-2">Variant 2</div>
          <div className="spec-title">
            <Ruler size={20} className="spec-icon" />
            <span>Size / UOM</span>
          </div>
          <button type="button" className="spec-expand-btn">
            {expandedSections.sizeUom ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.sizeUom && (
          <div className="spec-card">
            <p className="spec-description">
              Choose between Size variants (S, M, L, XL) or UOM variants (PCS, KG, MTR).
              Only one can be active at a time.
            </p>

            <div className="spec-content two-columns">
              {/* Size Option */}
              <div className="spec-option-card">
                <label className="spec-toggle">
                  <input
                    type="checkbox"
                    checked={specifications.size?.enabled || false}
                    onChange={(e) => handleToggleSpec('size', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Size Variants</span>
                </label>

                {specifications.size?.enabled && (
                  <div className="spec-groups-container">
                    <label className="spec-field-label">Select Size Groups:</label>
                    {renderGroupSelector('size', variantGroups.size, specifications.size?.groups)}
                  </div>
                )}
              </div>

              {/* UOM Option */}
              <div className="spec-option-card">
                <label className="spec-toggle">
                  <input
                    type="checkbox"
                    checked={specifications.uom?.enabled || false}
                    onChange={(e) => handleToggleSpec('uom', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">UOM Variants</span>
                </label>

                {specifications.uom?.enabled && (
                  <div className="spec-groups-container">
                    <label className="spec-field-label">Select UOM Groups:</label>
                    {renderGroupSelector('uom', variantGroups.uom, specifications.uom?.groups)}
                  </div>
                )}
              </div>
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
          <div className="spec-badge supplier">Supplier</div>
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
              Select which suppliers are available for items in this category.
              This helps in purchase order creation and vendor management.
            </p>

            <div className="spec-content">
              <label className="spec-toggle">
                <input
                  type="checkbox"
                  checked={specifications.vendor?.enabled || false}
                  onChange={(e) => handleToggleSpec('vendor', e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable Supplier Selection</span>
              </label>

              {specifications.vendor?.enabled && (
                <div className="spec-groups-container">
                  <label className="spec-field-label">Select Suppliers:</label>
                  {renderGroupSelector('vendor', variantGroups.vendor, specifications.vendor?.groups)}
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
          <div className="spec-badge brand">Brand</div>
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
              Associate brands with items in this category for brand-specific inventory tracking.
            </p>

            <div className="spec-content">
              <div className="spec-coming-soon">
                <span>Brand selection coming soon</span>
              </div>
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
          <div className="spec-badge custom">Custom</div>
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
        />
      )}
    </div>
  )
}
