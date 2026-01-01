import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check, Search } from 'lucide-react';

const GroupSelector = ({ groups = [], selected = [], onChange, placeholder = "Select groups..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      if (!insideWrapper && !insideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute dropdown position when opened and on resize/scroll
  useEffect(() => {
    const updatePos = () => {
      if (!wrapperRef.current) return;
      const r = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
    };
    if (isOpen) {
      updatePos();
      window.addEventListener('resize', updatePos);
      window.addEventListener('scroll', updatePos, true);
    }
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isOpen]);

  const handleToggle = (groupCode) => {
    const newSelected = selected.includes(groupCode)
      ? selected.filter(code => code !== groupCode)
      : [...selected, groupCode];
    onChange(newSelected);
  };

  const removeGroup = (groupCode, e) => {
    e.stopPropagation();
    onChange(selected.filter(code => code !== groupCode));
  };

  const filteredGroups = groups.filter(group => 
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.group_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedGroupsData = groups.filter(g => selected.includes(g.group_code));

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Selected Tags Area */}
      <div 
        className="min-h-[38px] p-1.5 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-2 cursor-text hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all"
        onClick={() => setIsOpen(true)}
      >
        {selectedGroupsData.map(group => (
          <span 
            key={group.group_code}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100"
          >
            {group.group_name}
            <button
              type="button"
              onClick={(e) => removeGroup(group.group_code, e)}
              className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        
        <input
          type="text"
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent px-1"
          placeholder={selected.length === 0 ? placeholder : ""}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {/* Dropdown (rendered via portal to avoid clipping/overlay issues) */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredGroups.length > 0 ? (
            <div className="py-1">
              {filteredGroups.map(group => {
                const isSelected = selected.includes(group.group_code);
                return (
                  <div
                    key={group.group_code}
                    onClick={() => handleToggle(group.group_code)}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{group.group_name}</span>
                      <span className="text-xs text-gray-500">{group.group_code}</span>
                    </div>
                    {isSelected && <Check size={16} className="text-blue-600" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              No groups found
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default GroupSelector;
