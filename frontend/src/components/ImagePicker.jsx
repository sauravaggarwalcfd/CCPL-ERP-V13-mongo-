import { useState, useEffect } from 'react'
import { X, Search, Image as ImageIcon, Check } from 'lucide-react'
import { files as filesApi } from '../services/api'
import toast from 'react-hot-toast'

export default function ImagePicker({ isOpen, onClose, onSelect, selectedImageId, variant = 'modal' }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('item_image')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 12

  useEffect(() => {
    if (isOpen) {
      fetchImages()
    }
  }, [isOpen, currentPage, selectedCategory, searchTerm])

  const fetchImages = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        page_size: pageSize,
        category: selectedCategory,
      }

      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await filesApi.list(params)
      setImages(response.data.files || [])
      setTotalPages(response.data.total_pages || 1)
    } catch (error) {
      console.error('Error fetching images:', error)
      toast.error('Failed to load images')
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (image) => {
    onSelect({
      image_id: image.file_id,
      image_url: image.file_url,
      image_name: image.original_name,
      thumbnail_url: image.thumbnail_url,
    })
    onClose()
  }

  if (!isOpen) return null

  // Panel variant: render inline block without overlay
  if (variant === 'panel') {
    return (
      <div className="bg-white rounded-lg w-full max-h-[80vh] overflow-hidden flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Select Image</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="item_image">Item Images</option>
              <option value="product_image">Product Images</option>
              <option value="logo">Logos</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No images found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  onClick={() => handleSelect(image)}
                  className={`
                    relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg
                    ${selectedImageId === image.file_id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={filesApi.getThumbnailUrl(image.thumbnail_url) || filesApi.getFileUrl(image.file_url)}
                      alt={image.original_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  </div>

                  {/* Selected Indicator */}
                  {selectedImageId === image.file_id && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  {/* Image Name */}
                  <div className="p-2 bg-white">
                    <p className="text-xs text-gray-700 truncate" title={image.original_name}>
                      {image.original_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Default modal variant
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Select Image</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="item_image">Item Images</option>
              <option value="product_image">Product Images</option>
              <option value="logo">Logos</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        
        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No images found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  onClick={() => handleSelect(image)}
                  className={`
                    relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg
                    ${selectedImageId === image.file_id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={filesApi.getThumbnailUrl(image.thumbnail_url) || filesApi.getFileUrl(image.file_url)}
                      alt={image.original_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  </div>

                  {/* Selected Indicator */}
                  {selectedImageId === image.file_id && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  {/* Image Name */}
                  <div className="p-2 bg-white">
                    <p className="text-xs text-gray-700 truncate" title={image.original_name}>
                      {image.original_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
