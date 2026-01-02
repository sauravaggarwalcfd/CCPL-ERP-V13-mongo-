import React from 'react'
import { HelpCircle } from 'lucide-react'

/**
 * SKU Display Component
 * Shows the full SKU and breaks down its components
 * Format: FM-ABCD-A0000-0000-00
 * 
 * Components:
 * 1. FM: Item Type Code (2 letters)
 * 2. ABCD: Category Code (2-4 letters)
 * 3. A0000: Item Sequence (1 letter + 4 digits)
 * 4. 0000: Primary Variant/Color (4 chars)
 * 5. 00: Secondary Variant/Size (2 chars)
 */
export default function SKUDisplay({ sku, detailed = false, compact = false }) {
  if (!sku) return null

  // Parse SKU components
  const parts = sku.split('-')
  if (parts.length !== 5) return <span className="text-red-600 text-xs">Invalid SKU format</span>

  const components = {
    itemType: parts[0],
    category: parts[1],
    sequence: parts[2],
    variant1: parts[3],
    variant2: parts[4]
  }

  if (compact) {
    return (
      <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono text-sm">
        {sku}
      </span>
    )
  }

  if (detailed) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-semibold text-indigo-900">Stock Keeping Unit (SKU)</h4>
          <HelpCircle size={14} className="text-indigo-600" />
        </div>
        
        <div className="font-mono text-lg font-bold text-indigo-700 mb-4 tracking-wide">
          {components.itemType}
          <span className="text-indigo-600 mx-1">-</span>
          {components.category}
          <span className="text-indigo-600 mx-1">-</span>
          {components.sequence}
          <span className="text-indigo-600 mx-1">-</span>
          {components.variant1}
          <span className="text-indigo-600 mx-1">-</span>
          {components.variant2}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded border border-indigo-200">
            <div className="text-xs font-semibold text-indigo-600 uppercase">Item Type</div>
            <div className="text-sm font-mono text-gray-900 mt-1">{components.itemType}</div>
            <div className="text-xs text-gray-600 mt-1">2 letters: e.g., FM, RM</div>
          </div>

          <div className="bg-white p-3 rounded border border-indigo-200">
            <div className="text-xs font-semibold text-indigo-600 uppercase">Category</div>
            <div className="text-sm font-mono text-gray-900 mt-1">{components.category}</div>
            <div className="text-xs text-gray-600 mt-1">2-4 letters: Last level name</div>
          </div>

          <div className="bg-white p-3 rounded border border-indigo-200">
            <div className="text-xs font-semibold text-indigo-600 uppercase">Sequence</div>
            <div className="text-sm font-mono text-gray-900 mt-1">{components.sequence}</div>
            <div className="text-xs text-gray-600 mt-1">1 letter + 4 digits: Auto-increment per type</div>
          </div>

          <div className="bg-white p-3 rounded border border-indigo-200">
            <div className="text-xs font-semibold text-indigo-600 uppercase">Variant 1</div>
            <div className="text-sm font-mono text-gray-900 mt-1">{components.variant1}</div>
            <div className="text-xs text-gray-600 mt-1">4 chars: Primary (Color)</div>
          </div>

          <div className="bg-white p-3 rounded border border-indigo-200">
            <div className="text-xs font-semibold text-indigo-600 uppercase">Variant 2</div>
            <div className="text-sm font-mono text-gray-900 mt-1">{components.variant2}</div>
            <div className="text-xs text-gray-600 mt-1">2 chars: Secondary (Size)</div>
          </div>
        </div>
      </div>
    )
  }

  // Default: Show SKU with breakdown on hover
  return (
    <div className="group relative inline-block">
      <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono text-sm cursor-help">
        {sku}
      </span>
      
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 whitespace-nowrap z-50">
        <div>Type: {components.itemType}</div>
        <div>Category: {components.category}</div>
        <div>Seq: {components.sequence}</div>
        <div>V1: {components.variant1} | V2: {components.variant2}</div>
      </div>
    </div>
  )
}
