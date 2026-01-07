import { useState, useRef, useEffect } from 'react'
import { Camera, X } from 'lucide-react'

export default function ImageUploadField({ onImageChange, currentImage }) {
  const [preview, setPreview] = useState(currentImage || null)
  const [uploading, setUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Cleanup camera stream when component unmounts or camera closes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    // Check if browser supports camera API
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    // Debug logging
    console.log('Camera access check:', {
      hasNavigator: !!navigator.mediaDevices,
      hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia),
      isSecureContext: isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecureContextAPI: window.isSecureContext
    })
    
    if (!navigator.mediaDevices) {
      if (!isSecureContext) {
        alert('Camera access requires HTTPS connection. Please access the site using HTTPS (https://) instead of HTTP, or use file upload instead.')
      } else {
        alert('Camera not supported on this browser. Please use a modern browser (Chrome, Firefox, Edge, Safari) or upload a file instead.')
      }
      return
    }

    if (!navigator.mediaDevices.getUserMedia) {
      alert('Camera API not available. Please update your browser or use file upload instead.')
      return
    }

    setCameraLoading(true)
    setCameraError(null)
    
    try {
      // Request camera access with proper constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      setStream(mediaStream)
      setShowCamera(true)
      setCameraLoading(false)
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err)
          })
        }
      }, 100)
    } catch (error) {
      setCameraLoading(false)
      console.error('Camera access error:', error)
      
      // Provide specific error messages based on error type
      let errorMessage = 'Unable to access camera. '
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Camera permission was denied. Please allow camera access in your browser settings and try again.'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on your device. Please use file upload instead.'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application. Please close other apps and try again.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Camera does not meet requirements. Trying again with default settings...'
        // Try again with simpler constraints
        trySimpleCamera()
        return
      } else if (error.name === 'SecurityError') {
        errorMessage += 'Camera access blocked for security reasons. Please use HTTPS or allow camera permissions.'
      } else {
        errorMessage += 'Please check camera permissions in browser settings or use file upload instead.'
      }
      
      alert(errorMessage)
      setCameraError(error.name)
    }
  }

  // Fallback camera access with minimal constraints
  const trySimpleCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      })
      
      setStream(mediaStream)
      setShowCamera(true)
      setCameraLoading(false)
      
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err)
          })
        }
      }, 100)
    } catch (err) {
      console.error('Simple camera access also failed:', err)
      alert('Unable to access camera with any settings. Please use file upload instead.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) return
      
      // Check file size (1MB max)
      if (blob.size > 1 * 1024 * 1024) {
        alert('Captured image is too large. Please try again with better lighting or closer to subject.')
        return
      }
      
      // Convert blob to base64
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageData = event.target.result
        setPreview(imageData)
        
        // Pass back the BASE64 data
        const base64Data = imageData.split(',')[1]
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
        onImageChange(file, base64Data, 'image/jpeg')
        
        // Stop camera and close modal
        stopCamera()
      }
      reader.readAsDataURL(blob)
    }, 'image/jpeg', 0.9) // 90% quality JPEG
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size (1MB max as per requirement)
    if (file.size > 1 * 1024 * 1024) {
      alert('Image too large. Max 1MB (as per system requirements)')
      e.target.value = ''
      return
    }

    // Validate file type (JPEG and PNG only as per requirement)
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      alert('Please select only JPEG or PNG images')
      e.target.value = ''
      return
    }

    // Create preview and convert to BASE64
    const reader = new FileReader()
    reader.onload = (event) => {
      const imageData = event.target.result
      setPreview(imageData)

      // Pass back the BASE64 data (without data:image/jpeg;base64, prefix for storage)
      const base64Data = imageData.split(',')[1]
      onImageChange(file, base64Data, file.type)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onImageChange(null, null, null)
  }

  return (
    <>
      {/* Camera Loading Modal */}
      {cameraLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            textAlign: 'center',
            color: 'white',
            padding: '30px'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>📷</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Requesting Camera Access</h3>
            <p style={{ fontSize: '14px', color: '#ccc' }}>
              Please allow camera access in your browser
            </p>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && !cameraLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: '#000'
          }}>
            <button
              onClick={stopCamera}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <X size={24} />
            </button>
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 100px)',
                display: 'block'
              }}
            />
            
            <div style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#000'
            }}>
              <button
                onClick={capturePhoto}
                style={{
                  padding: '15px 40px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <Camera size={20} />
                Capture Photo
              </button>
            </div>
          </div>
          
          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* Image Upload Field */}
      <div style={{
      marginBottom: '20px',
      padding: '15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>Item Image</h3>

      {preview ? (
        <>
          <div style={{
            width: '200px',
            height: '200px',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '15px',
            border: '2px solid #ddd',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <img
              src={preview}
              alt="Item preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <label style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📷 Change Image
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </label>

            <button
              type="button"
              onClick={startCamera}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Camera size={16} />
              Capture Photo
            </button>

            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ✕ Remove Image
            </button>
          </div>
        </>
      ) : (
        <div>
          <label style={{
            display: 'block',
            padding: '40px 20px',
            border: '2px dashed #007bff',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#f0f7ff',
            transition: 'all 0.3s ease',
            marginBottom: '10px'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#333' }}>
              📸 Click to upload image
            </p>
            <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
              JPEG or PNG only (Max 1MB)
            </p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </label>
          
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={startCamera}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Camera size={18} />
              Or Capture from Camera
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
