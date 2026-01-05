import { useState, useEffect } from 'react'
import { Settings, Plus, Edit2, Trash2, List, FileText, Hash, CheckSquare, X, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLayout } from '../../context/LayoutContext'
import './SpecialAttributes.css'

/**
 * SpecialAttributes - Management page for custom specifications
 * Allows creating, editing, and managing custom specification definitions
 */
export default function SpecialAttributes() {
  const { setTitle } = useLayout()
  const [customSpecs, setCustomSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSpec, setEditingSpec] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    spec_code: '',
    spec_name: '',
    spec_type: 'DROPDOWN',
    description: '',
    options: [],
    is_mandatory: false
  })
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    setTitle('Special Attributes')
    fetchSpecifications()
  }, [setTitle])

  const fetchSpecifications = async () => {
    setLoading(true)
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
        ])
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error('Error fetching specifications:', error)
      toast.error('Failed to load specifications')
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingSpec(null)
    setFormData({
      spec_code: '',
      spec_name: '',
      spec_type: 'DROPDOWN',
      description: '',
      options: [],
      is_mandatory: false
    })
    setShowForm(true)
  }

  const handleEdit = (spec) => {
    setEditingSpec(spec)
    setFormData({
      spec_code: spec.spec_code,
      spec_name: spec.spec_name,
      spec_type: spec.spec_type,
      description: spec.description || '',
      options: spec.options || [],
      is_mandatory: spec.is_mandatory || false
    })
    setShowForm(true)
  }

  const handleDelete = async (spec) => {
    if (!window.confirm(`Are you sure you want to delete "${spec.spec_name}"?`)) {
      return
    }

    try {
      // In production, delete via API
      // await axiosInstance.delete(`/api/specifications/custom-specifications/${spec.spec_code}`)

      setCustomSpecs(prev => prev.filter(s => s._id !== spec._id))
      toast.success('Specification deleted successfully')
    } catch (error) {
      console.error('Error deleting specification:', error)
      toast.error('Failed to delete specification')
    }
  }

  const handleAddOption = () => {
    if (!newOption.trim()) return

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
    }))
    setNewOption('')
  }

  const handleRemoveOption = (code) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt.code !== code)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.spec_code || !formData.spec_name) {
      toast.error('Please fill in required fields')
      return
    }

    setSaving(true)
    try {
      if (editingSpec) {
        // Update existing
        // await axiosInstance.put(`/api/specifications/custom-specifications/${editingSpec.spec_code}`, formData)

        setCustomSpecs(prev => prev.map(s =>
          s._id === editingSpec._id
            ? { ...s, ...formData }
            : s
        ))
        toast.success('Specification updated successfully')
      } else {
        // Create new
        // const response = await axiosInstance.post('/api/specifications/custom-specifications', formData)

        const newSpec = {
          _id: `new_${Date.now()}`,
          ...formData,
          is_active: true,
          created_date: new Date().toISOString()
        }
        setCustomSpecs(prev => [...prev, newSpec])
        toast.success('Specification created successfully')
      }

      setShowForm(false)
      setEditingSpec(null)
    } catch (error) {
      console.error('Error saving specification:', error)
      toast.error('Failed to save specification')
    } finally {
      setSaving(false)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'DROPDOWN':
        return <List size={18} className="type-icon dropdown" />
      case 'TEXT':
        return <FileText size={18} className="type-icon text" />
      case 'NUMBER':
        return <Hash size={18} className="type-icon number" />
      case 'CHECKBOX':
        return <CheckSquare size={18} className="type-icon checkbox" />
      default:
        return <Settings size={18} className="type-icon" />
    }
  }

  return (
    <div className="special-attributes">
      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-content">
          <div className="sa-header-icon">
            <Settings size={32} />
          </div>
          <div>
            <h1>Special Attributes</h1>
            <p>Manage custom specifications for item categories</p>
          </div>
        </div>
        <div className="sa-header-actions">
          <button onClick={fetchSpecifications} className="btn-refresh" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleCreateNew} className="btn-create">
            <Plus size={18} />
            Create New Specification
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="sa-content">
        {loading ? (
          <div className="sa-loading">
            <div className="loading-spinner"></div>
            <span>Loading specifications...</span>
          </div>
        ) : (
          <div className="sa-grid">
            {/* Specifications List */}
            <div className={`sa-list ${showForm ? 'with-form' : ''}`}>
              {customSpecs.length === 0 ? (
                <div className="sa-empty">
                  <Settings size={64} />
                  <h3>No Specifications Yet</h3>
                  <p>Create custom specifications to use across item categories</p>
                  <button onClick={handleCreateNew} className="btn-create-first">
                    <Plus size={18} />
                    Create First Specification
                  </button>
                </div>
              ) : (
                <div className="specs-grid">
                  {customSpecs.map(spec => (
                    <div
                      key={spec._id}
                      className={`spec-card ${editingSpec?._id === spec._id ? 'editing' : ''}`}
                    >
                      <div className="spec-card-header">
                        <div className="spec-card-title">
                          {getTypeIcon(spec.spec_type)}
                          <div>
                            <h3>{spec.spec_name}</h3>
                            <span className="spec-code">{spec.spec_code}</span>
                          </div>
                        </div>
                        <span className={`spec-type-badge ${spec.spec_type.toLowerCase()}`}>
                          {spec.spec_type}
                        </span>
                      </div>

                      {spec.description && (
                        <p className="spec-card-desc">{spec.description}</p>
                      )}

                      {spec.options && spec.options.length > 0 && (
                        <div className="spec-card-options">
                          <strong>Options ({spec.options.length}):</strong>
                          <div className="options-display">
                            {spec.options.slice(0, 4).map(opt => (
                              <span key={opt.code} className="option-badge">
                                {opt.value}
                              </span>
                            ))}
                            {spec.options.length > 4 && (
                              <span className="option-badge more">
                                +{spec.options.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="spec-card-footer">
                        <div className="spec-meta">
                          {spec.is_mandatory && (
                            <span className="mandatory-tag">Required</span>
                          )}
                          <span className={`status-tag ${spec.is_active ? 'active' : 'inactive'}`}>
                            {spec.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="spec-actions">
                          <button
                            onClick={() => handleEdit(spec)}
                            className="btn-edit"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(spec)}
                            className="btn-delete"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Panel */}
            {showForm && (
              <div className="sa-form-panel">
                <div className="form-panel-header">
                  <h2>
                    {editingSpec ? 'Edit Specification' : 'Create New Specification'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="btn-close-form">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="sa-form">
                  <div className="form-group">
                    <label>
                      Specification Code <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.spec_code}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        spec_code: e.target.value.toUpperCase().replace(/\s+/g, '_')
                      }))}
                      placeholder="e.g., FIT_TYPE"
                      className="form-input"
                      disabled={editingSpec !== null}
                    />
                    <small>Unique identifier (no spaces, auto-uppercase)</small>
                  </div>

                  <div className="form-group">
                    <label>
                      Specification Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.spec_name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        spec_name: e.target.value
                      }))}
                      placeholder="e.g., Fit Type"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Field Type</label>
                    <select
                      value={formData.spec_type}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        spec_type: e.target.value
                      }))}
                      className="form-input"
                    >
                      <option value="DROPDOWN">Dropdown (Select)</option>
                      <option value="TEXT">Text</option>
                      <option value="NUMBER">Number</option>
                      <option value="CHECKBOX">Checkbox</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="Optional description"
                      className="form-input"
                      rows={3}
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_mandatory}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          is_mandatory: e.target.checked
                        }))}
                      />
                      <span>Required field (mandatory for items)</span>
                    </label>
                  </div>

                  {formData.spec_type === 'DROPDOWN' && (
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

                      {formData.options.length > 0 && (
                        <div className="options-list">
                          {formData.options.map((opt, idx) => (
                            <div key={opt.code} className="option-item">
                              <span className="option-number">{idx + 1}</span>
                              <span className="option-value">{opt.value}</span>
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

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-save"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="btn-spinner"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          {editingSpec ? 'Update' : 'Create'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
