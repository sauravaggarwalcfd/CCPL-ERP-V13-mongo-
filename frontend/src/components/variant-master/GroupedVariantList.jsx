/**
 * Grouped Variant List Component
 * Displays variant items grouped by their categories
 */

const GroupedVariantList = ({ groupedItems, groups, renderItem, emptyMessage }) => {
  const groupKeys = Object.keys(groupedItems);

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

  return (
    <div className="space-y-6">
      {groupKeys.map((groupKey) => {
        const items = groupedItems[groupKey];
        const groupName = getGroupName(groupKey);

        return (
          <div key={groupKey} className="bg-white rounded-lg border overflow-hidden">
            {/* Group Header */}
            <div className="bg-gray-50 px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{groupName}</h3>
                <span className="text-sm text-gray-500">{items.length} items</span>
              </div>
            </div>

            {/* Group Items */}
            <div className="p-4 space-y-2">
              {items.map((item) => (
                <div key={item.id || item.colour_code || item.size_code || item.uom_code}>
                  {renderItem(item)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GroupedVariantList;
