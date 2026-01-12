import { useState, useEffect } from 'react'
import { X, Plus, Settings, FileText, Hash, CheckSquare, List, Link, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { specificationApi } from '../../services/specificationApi'
import './CustomSpecModal.css'

/**
 * CustomSpecModal - Modal for creating and selecting custom specifications
 *
 * Props:
 * - isOpen: boolean to control modal visibility
 * - onClose: function to close the modal
 * - onAdd: function to add a selected/created specification
 * - selectedSpecs: array of already selected specifications
 * - onNavigateToVariant: function to navigate to variant master
 */
export default function CustomSpecModal({
  isOpen,
  onClose,
  onAdd,
  selectedSpecs = [],
  onNavigateToVariant
}) {
  const [activeTab, setActiveTab] = useState('select') // 'select' or 'create'
  const [availableSpecs, setAvailableSpecs] = useState([])
  const [loading, setLoading] = useState(true)

  // New specification form state
  const [newSpec, setNewSpec] = useState({
    spec_code: '',
    spec_name: '',
    spec_type: 'DROPDOWN',
    description: '',
    options: [],
    is_mandatory: false
  })
  const [newOption, setNewOption] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSpecs()
    }
  }, [isOpen])

  const fetchAvailableSpecs = async () => {
    setLoading(true)
    try {
      // Fetch from API
      const response = await specificationApi.getAvailableCustomFields()
      console.log('[CustomSpecModal] Fetched available custom fields:', response.data)
      setAvailableSpecs(response.data || [])
    } catch (error) {
      console.error('[CustomSpecModal] Error fetching specifications:', error)
      // Fallback to empty list
      setAvailableSpecs([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSpec = (spec) => {
    if (!selectedSpecs.find(s => s.field_code === spec.spec_code)) {
      onAdd({
        field_code: spec.spec_code,
        field_name: spec.spec_name,
        field_type: spec.spec_type,
        required: spec.is_mandatory || false,
        options: spec.options || [],
        enabled: true,
        display_order: selectedSpecs.length
      })
      onClose()
    }
  }

  const handleAddOption = () => {
    if (!newOption.trim()) return

    setNewSpec(prev => ({
      ...prev,
      options: [
        ...prev.options,
        {
          code: `OPT_${Date.now()}`,
          value: newOption.trim()
        }
      ]
    }))
    setNewOption('')
  }

  const handleRemoveOption = (code) => {
    setNewSpec(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt.code !== code)
    }))
  }

  const handleCreateSpec = async () => {
    if (!newSpec.spec_code || !newSpec.spec_name) {
      toast.error('Please fill in code and name')
      return
    }

    setCreating(true)
    try {
      // Create the new specification object
      const newSpecObj = {
        spec_code: newSpec.spec_code.toUpperCase(),
        spec_name: newSpec.spec_name,
        spec_type: newSpec.spec_type,
        description: newSpec.description || newSpec.spec_name,
        options: newSpec.options || [],
        is_mandatory: newSpec.is_mandatory,
        is_active: true
      }

      // Add to the available specs list so it appears immediately
      setAvailableSpecs(prev => [
        ...prev,
        {
          _id: `new_${Date.now()}`,
          ...newSpecObj
        }
      ])

      // Callback to add to selected specs
      onAdd(newSpecObj)

      // Reset form
      setNewSpec({
        spec_code: '',
        spec_name: '',
        spec_type: 'DROPDOWN',
        description: '',
        options: [],
        is_mandatory: false
      })

      toast.success('Specification created and added successfully')
      onClose()
    } catch (error) {
      console.error('Error creating specification:', error)
      toast.error('Failed to create specification')
    } finally {
      setCreating(false)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'DROPDOWN':
        return <List size={16} />
      case 'TEXT':
        return <FileText size={16} />
      case 'NUMBER':
        return <Hash size={16} />
      case 'CHECKBOX':
        return <CheckSquare size={16} />
      default:
        return <Settings size={16} />
    }
  }

  const unselectedSpecs = availableSpecs.filter(
    spec => !selectedSpecs.find(s => s.field_code === spec.spec_code)
  )

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content custom-spec-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            <Settings size={24} className="modal-icon" />
            <div>
              <h2>Custom Specifications</h2>
              <p>Add specialized attributes for this category</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${activeTab === 'select' ? 'active' : ''}`}
            onClick={() => setActiveTab('select')}
          >
            <List size={18} />
            Select Existing
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <Plus size={18} />
            Create New
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {activeTab === 'select' ? (
            // Select Existing Tab
            <div className="select-tab">
              {loading ? (
                <div className="modal-loading">
                  <div className="loading-spinner"></div>
                  <span>Loading specifications...</span>
                </div>
              ) : unselectedSpecs.length === 0 ? (
                <div className="empty-state">
                  <Settings size={48} />
                  <p>No specifications available</p>
                  <small>Create custom specifications in the "Create New" tab</small>
                </div>
              ) : (
                <div className="spec-list">
                  {unselectedSpecs.map(spec => (
                    <div
                      key={spec._id}
                      className="spec-option"
                      onClick={() => handleSelectSpec(spec)}
                    >
                      <div className="spec-option-header">
                        <div className="spec-option-title">
                          {getTypeIcon(spec.spec_type)}
                          <h4>{spec.spec_name}</h4>
                        </div>
                        <span className="spec-type-badge">{spec.spec_type}</span>
                      </div>

                      {spec.description && (
                        <p className="spec-option-desc">{spec.description}</p>
                      )}

                      {spec.options && spec.options.length > 0 && (
                        <div className="spec-option-options">
                          <small>Options:</small>
                          <div className="options-preview">
                            {spec.options.slice(0, 3).map(opt => (
                              <span key={opt.code} className="option-tag">
                                {opt.value}
                              </span>
                            ))}
                            {spec.options.length > 3 && (
                              <span className="option-tag more">
                                +{spec.options.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <button type="button" className="btn-select-spec">
                        <Plus size={16} />
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Create New Tab
            <div className="create-tab">
              <div className="create-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Specification Code <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newSpec.spec_code}
                      onChange={(e) => setNewSpec(prev => ({
                        ...prev,
                        spec_code: e.target.value.toUpperCase().replace(/\s+/g, '_')
                      }))}
                      placeholder="e.g., FIT_TYPE"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Specification Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newSpec.spec_name}
                      onChange={(e) => setNewSpec(prev => ({
                        ...prev,
                        spec_name: e.target.value
                      }))}
                      placeholder="e.g., Fit Type"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Field Type</label>
                    <select
                      value={newSpec.spec_type}
                      onChange={(e) => setNewSpec(prev => ({
                        ...prev,
                        spec_type: e.target.value
                      }))}
                      className="form-input"
                    >
                      <option value="DROPDOWN">Dropdown</option>
                      <option value="TEXT">Text</option>
                      <option value="NUMBER">Number</option>
                      <option value="CHECKBOX">Checkbox</option>
                    </select>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newSpec.is_mandatory}
                        onChange={(e) => setNewSpec(prev => ({
                          ...prev,
                          is_mandatory: e.target.checked
                        }))}
                      />
                      <span>Required field</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newSpec.description}
                    onChange={(e) => setNewSpec(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Optional description for this specification"
                    className="form-input"
                    rows={2}
                  />
                </div>

                {newSpec.spec_type === 'DROPDOWN' && (
                  <div className="form-group">
                    <label>Options</label>
                    <div className="options-input">
                      <input
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                        placeholder="Type option and press Enter"
                        className="form-input"
                      />
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="btn-add-option"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {newSpec.options.length > 0 && (
                      <div className="options-list">
                        {newSpec.options.map(opt => (
                          <div key={opt.code} className="option-item">
                            <span>{opt.value}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(opt.code)}
                              className="btn-remove-option"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          {activeTab === 'create' && (
            <button
              type="button"
              onClick={handleCreateSpec}
              className="btn-create"
              disabled={creating || !newSpec.spec_code || !newSpec.spec_name}
            >
              {creating ? (
                <>
                  <div className="btn-spinner"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create & Add
                </>
              )}
            </button>
          )}
          {onNavigateToVariant && (
            <button type="button" onClick={onNavigateToVariant} className="btn-manage">
              <ExternalLink size={16} />
              Manage All Specifications
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
