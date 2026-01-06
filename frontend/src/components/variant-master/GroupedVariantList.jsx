/**
 * Grouped Variant List Component
 * Displays variant items grouped by their categories
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, UserPlus } from 'lucide-react';

const GroupedVariantList = ({ groupedItems, groups, renderItem, emptyMessage, onAddToGroup }) => {
  const groupKeys = Object.keys(groupedItems);
  // Track collapsed state (true = collapsed) - default all groups to collapsed
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    const initialState = {};
    Object.keys(groupedItems).forEach(key => {
      initialState[key] = true; // All groups collapsed by default
    });
    return initialState;
  });

  if (groupKeys.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
        {emptyMessage || 'No items found'}
      </div>
    );
  }

  // Get group name from code
  const getGroupName = (groupCode) => {
    const group = groups.find((g) => g.code === groupCode || g.value === groupCode);
    return group ? group.name : groupCode;
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      // If not set or true (collapsed), set to false (expanded); otherwise set to true (collapsed)
      [groupKey]: prev[groupKey] === false ? true : false
    }));
  };

  return (
    <div className="space-y-6">
      {groupKeys.map((groupKey) => {
        const items = groupedItems[groupKey];
        const groupName = getGroupName(groupKey);
        // Default to collapsed if not in state
        const isCollapsed = collapsedGroups[groupKey] !== false;

        return (
          <div key={groupKey} className="bg-white rounded-lg border overflow-hidden">
            {/* Group Header */}
            <div 
              className="bg-gray-50 px-4 py-3 border-b cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleGroup(groupKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                  <h3 className="font-semibold text-gray-900">{groupName}</h3>
                  <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{items.length} items</span>
                </div>
                {/* Add to Group Button */}
                {onAddToGroup && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToGroup(groupKey);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition"
                    title={`Add item to ${groupName}`}
                  >
                    <UserPlus size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Group Items */}
            {!isCollapsed && (
              <div className="p-4 space-y-2">
                {items.map((item) => (
                  <div key={item.id || item.colour_code || item.size_code || item.uom_code}>
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedVariantList;
