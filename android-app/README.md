# CCPL ERP Android App

A WebView-based Android app that connects to your CCPL ERP web application.

## Features

- **Configurable Server**: Enter your server IP/hostname and port
- **Swipe to Refresh**: Pull down to refresh the page
- **File Upload Support**: Upload files directly from the app
- **Offline Error Handling**: Shows connection error with retry option
- **Back Navigation**: Use Android back button to navigate within the app

## Building the APK

### Option 1: Using Android Studio (Recommended)

1. **Install Android Studio** from https://developer.android.com/studio

2. **Open the project**:
   - Open Android Studio
   - Click "Open" and select the `android-app` folder

3. **Build the APK**:
   - Go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`
   - The APK will be generated at: `app/build/outputs/apk/debug/app-debug.apk`

4. **For Release APK** (signed):
   - Go to `Build` > `Generate Signed Bundle / APK`
   - Follow the wizard to create a keystore and sign the APK

### Option 2: Using Command Line

1. **Install JDK 17** (required for Android builds)

2. **Navigate to android-app folder**:
   ```bash
   cd android-app
   ```

3. **Build Debug APK**:
   ```bash
   # On Windows
   gradlew.bat assembleDebug

   # On Mac/Linux
   ./gradlew assembleDebug
   ```

4. **Find the APK at**: `app/build/outputs/apk/debug/app-debug.apk`

## Using the App

1. **Install the APK** on your Android device (enable "Install from unknown sources")

2. **First Launch**:
   - The app will ask for your server IP address
   - Enter your public IP (with port forwarding) or local IP
   - Default port is 5173 (Vite dev server)

3. **Example Configurations**:
   - Local network: `192.168.1.100` with port `5173`
   - Public IP: `your-public-ip` with port `5173`
   - Domain: `erp.yourdomain.com` with port `80` or `443`

## Troubleshooting

- **Cannot connect**: Make sure the server is running and accessible
- **Blank screen**: Check if the IP address is correct
- **Slow loading**: The first load may take time to fetch all resources

## Port Forwarding

To access from outside your network:
1. Forward port 5173 (or your chosen port) on your router
2. Use your public IP address in the app configuration
3. Consider using a static IP or dynamic DNS service

## Security Note

This app allows HTTP (cleartext) traffic for local development. For production:
- Use HTTPS with a valid SSL certificate
- Update `network_security_config.xml` to restrict cleartext traffic
