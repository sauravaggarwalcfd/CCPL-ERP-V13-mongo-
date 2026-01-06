/**
 * Colour Master Component
 * Manages colour variants with grouping and hex preview
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, Eye, Settings, UserPlus, X, Check } from 'lucide-react';
import { colourApi } from '../../services/variantApi';
import ColourForm from './ColourForm';
import ColourPreview from './ColourPreview';
import GroupedVariantList from './GroupedVariantList';
import VariantGroupManager from './VariantGroupManager';

const ColourMaster = () => {
  const [colours, setColours] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editingColour, setEditingColour] = useState(null);
  const [previewColour, setPreviewColour] = useState(null);
  
  // Add to group modal state
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [addToGroupTarget, setAddToGroupTarget] = useState(null);
  const [selectedColoursForGroup, setSelectedColoursForGroup] = useState([]);

  // Load colours and groups
  useEffect(() => {
    loadData();
  }, [selectedGroup]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load groups
      const groupsRes = await colourApi.getGroups();
      setGroups(groupsRes.data || []);

      // Load colours
      const params = {
        is_active: true,
      };
      if (selectedGroup !== 'all') {
        params.group = selectedGroup;
      }

      const coloursRes = await colourApi.list(params);
      setColours(coloursRes.data || []);
    } catch (error) {
      console.error('Error loading colours:', error);
      toast.error('Failed to load colours');
    } finally {
      setLoading(false);
    }
  };

  // Group colours by colour_groups (supports multiple groups)
  const groupedColours = colours.reduce((acc, colour) => {
    const colourGroups = colour.colour_groups && colour.colour_groups.length > 0
      ? colour.colour_groups
      : (colour.colour_group ? [colour.colour_group] : ['UNGROUPED']);
    
    colourGroups.forEach(group => {
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(colour);
    });
    return acc;
  }, {});

  // Filter colours by search term
  const filteredGroupedColours = Object.keys(groupedColours).reduce((acc, group) => {
    const filtered = groupedColours[group].filter(
      (colour) =>
        colour.colour_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colour.colour_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {});

  const handleCreate = () => {
    setEditingColour(null);
    setShowForm(true);
  };

  const handleEdit = (colour) => {
    setEditingColour(colour);
    setShowForm(true);
  };

  const handleDelete = async (colour) => {
    if (!confirm(`Are you sure you want to delete colour "${colour.colour_name}"?`)) {
      return;
    }

    try {
      await colourApi.delete(colour.colour_code);
      toast.success('Colour deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting colour:', error);
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Failed to delete colour';
      toast.error(message);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingColour) {
        await colourApi.update(editingColour.colour_code, data);
        toast.success('Colour updated successfully');
      } else {
        await colourApi.create(data);
        toast.success('Colour created successfully');
      }
      setShowForm(false);
      setEditingColour(null);
      loadData();
    } catch (error) {
      console.error('Error saving colour:', error);
      let message = 'Failed to save colour';
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

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingColour(null);
  };

  // Handle opening Add to Group modal
  const handleOpenAddToGroup = (groupCode) => {
    setAddToGroupTarget(groupCode);
    setSelectedColoursForGroup([]);
    setShowAddToGroupModal(true);
  };

  // Handle adding colours to group
  const handleAddColoursToGroup = async () => {
    if (!addToGroupTarget || selectedColoursForGroup.length === 0) {
      toast.error('Please select at least one colour');
      return;
    }

    try {
      for (const colourCode of selectedColoursForGroup) {
        const colour = colours.find(c => c.colour_code === colourCode);
        if (colour) {
          const currentGroups = colour.colour_groups || (colour.colour_group ? [colour.colour_group] : []);
          if (!currentGroups.includes(addToGroupTarget)) {
            const updatedGroups = [...currentGroups, addToGroupTarget];
            await colourApi.update(colourCode, {
              ...colour,
              colour_groups: updatedGroups,
              colour_group: updatedGroups[0]
            });
          }
        }
      }
      
      toast.success(`Added ${selectedColoursForGroup.length} colour(s) to group`);
      setShowAddToGroupModal(false);
      setAddToGroupTarget(null);
      setSelectedColoursForGroup([]);
      loadData();
    } catch (error) {
      toast.error('Failed to add colours to group');
      console.error(error);
    }
  };

  // Get colours not in target group
  const getColoursNotInGroup = (groupCode) => {
    return colours.filter(colour => {
      const colourGroups = colour.colour_groups || (colour.colour_group ? [colour.colour_group] : []);
      return !colourGroups.includes(groupCode);
    });
  };

  // Toggle colour selection for adding to group
  const toggleColourForGroup = (colourCode) => {
    setSelectedColoursForGroup(prev => 
      prev.includes(colourCode) 
        ? prev.filter(c => c !== colourCode)
        : [...prev, colourCode]
    );
  };

  // Handle creating new colour for a specific group
  const handleCreateForGroup = (groupCode) => {
    setEditingColour({ colour_groups: [groupCode], colour_group: groupCode });
    setShowForm(true);
    setShowAddToGroupModal(false);
  };

  // Get group name from code
  const getGroupName = (groupCode) => {
    if (groupCode === 'UNGROUPED') return 'Ungrouped';
    const group = groups.find(g => g.code === groupCode || g.value === groupCode);
    return group ? group.name : groupCode;
  };

  const renderColourItem = (colour) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 flex-1">
        {/* Colour Preview */}
        <div
          className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer"
          style={{ backgroundColor: colour.colour_hex }}
          onClick={() => setPreviewColour(colour)}
          title="Click to preview"
        />

        {/* Colour Info */}
        <div className="flex-1">
          <div className="font-medium text-gray-900">{colour.colour_name}</div>
          <div className="text-sm text-gray-500">
            {colour.colour_code} • {colour.colour_hex}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPreviewColour(colour)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
          title="Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleEdit(colour)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(colour)}
          className="p-2 text-red-600 hover:bg-red-50 rounded"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

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
              placeholder="Search colours..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Groups</option>
            {groups.map((group) => (
              <option key={group.code} value={group.code}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGroupManager(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Manage Groups
          </button>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Colour
          </button>
        </div>
      </div>

      {/* Grouped List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading colours...</div>
      ) : (
        <GroupedVariantList
          groupedItems={filteredGroupedColours}
          groups={groups}
          renderItem={renderColourItem}
          emptyMessage="No colours found"
          onAddToGroup={handleOpenAddToGroup}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <ColourForm
          colour={editingColour}
          groups={groups}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Group Manager Modal */}
      {showGroupManager && (
        <VariantGroupManager
          variantType="COLOUR"
          onClose={() => {
            setShowGroupManager(false);
            loadData();
          }}
        />
      )}

      {/* Preview Modal */}
      {previewColour && (
        <ColourPreview
          colour={previewColour}
          onClose={() => setPreviewColour(null)}
        />
      )}

      {/* Add to Group Modal */}
      {showAddToGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Colours to "{getGroupName(addToGroupTarget)}"
              </h3>
              <button
                onClick={() => {
                  setShowAddToGroupModal(false);
                  setAddToGroupTarget(null);
                  setSelectedColoursForGroup([]);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {getColoursNotInGroup(addToGroupTarget).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  All colours are already in this group
                </div>
              ) : (
                <div className="space-y-2">
                  {getColoursNotInGroup(addToGroupTarget).map((colour) => (
                    <label
                      key={colour.id || colour._id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColoursForGroup.includes(colour.id || colour._id)}
                        onChange={() => toggleColourForGroup(colour.id || colour._id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: colour.hex_code }}
                      />
                      <span className="font-medium">{colour.colour_code}</span>
                      <span className="text-gray-600">- {colour.colour_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <button
                onClick={() => handleCreateForGroup(addToGroupTarget)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Colour
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowAddToGroupModal(false);
                    setAddToGroupTarget(null);
                    setSelectedColoursForGroup([]);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddColoursToGroup}
                  disabled={selectedColoursForGroup.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Add Selected ({selectedColoursForGroup.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColourMaster;
