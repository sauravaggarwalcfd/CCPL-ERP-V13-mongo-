# HTTPS Setup Guide

## ✅ HTTPS is Now Enabled

Your ERP application is now configured to run with HTTPS using a self-signed SSL certificate.

## 🚀 How to Start the Application

### Start Frontend with HTTPS:
```bash
cd frontend
npm run dev
```

The application will now be available at:
- **HTTPS**: `https://localhost:5173`
- **Network**: `https://192.168.x.x:5173` (Your local IP)

### Start Backend:
```bash
cd backend
# On Windows:
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use your existing start script
```

## ⚠️ Self-Signed Certificate Warning

When you first access `https://localhost:5173`, your browser will show a security warning because it's a self-signed certificate. This is normal for local development.

### How to Proceed:

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"

**Firefox:**
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

**Mobile Chrome (Android):**
1. Type `thisisunsafe` (no spaces) on the warning page
2. Or click "Advanced" → "Proceed"

## 📱 Camera Access

Now that HTTPS is enabled:
- ✅ Camera will work on all pages
- ✅ Camera will work on mobile devices
- ✅ No more "Camera not supported" errors

## 🔧 Troubleshooting

### If you see "NET::ERR_CERT_AUTHORITY_INVALID":
This is expected with self-signed certificates. Click "Advanced" and proceed.

### If camera still doesn't work:
1. Make sure you're accessing via `https://` (not `http://`)
2. Check browser permissions: Settings → Privacy → Camera
3. Open browser console (F12) to see debug logs

### To disable HTTPS (if needed):
1. Edit `frontend/vite.config.js`
2. Remove `basicSsl()` from plugins
3. Remove `https: true` from server config
4. Restart the dev server

## 📝 For Production

For production deployment, use a proper SSL certificate from:
- Let's Encrypt (free)
- Your hosting provider
- Commercial SSL certificate providers

## 🌐 Access from Mobile/Other Devices

1. Find your computer's IP address:
   ```bash
   # Windows:
   ipconfig
   # Look for "IPv4 Address" (e.g., 192.168.1.100)
   ```

2. On your mobile device, open browser and go to:
   ```
   https://YOUR_IP:5173
   ```
   Example: `https://192.168.1.100:5173`

3. Accept the security warning on mobile too

4. Now camera will work on mobile! 📸
