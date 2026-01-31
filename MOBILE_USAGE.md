# Mobile Usage Guide for Debtsify

You can use Debtsify on mobile devices in three ways, ranging from simplest to most advanced.

---

## 1. Mobile Browser (Simplest)

Since your application uses **responsive design** (Tailwind CSS) and has a mobile layout (Sidebar becomes a hamburger menu), it works perfectly in any mobile browser.

- **How to use**: Just open `https://debtsify.vercel.app` (your deployed URL) in Chrome or Safari on your phone.
- **Experience**: It will look and feel like an app, but with the browser address bar visible.

---

## 2. "Add to Home Screen" (PWA Style)

You can install the website as an app on your phone without going through the App Store. This removes the address bar and gives it a full-screen "App" feel.

### For iPhone (iOS)
1. Open the website in **Safari**.
2. Tap the **Share** button (rectangle with arrow up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.
5. The Debtsify icon will appear on your home screen like a real app.

### For Android (Chrome)
1. Open the website in **Chrome**.
2. Tap the **Three Dots** menu (top right).
3. Tap **Add to Home screen** or **Install App**.
4. Follow the prompts.

### 🔧 Developer Step: Make it a True PWA
To make the experience even better (offline support, custom icon, proper name), you can turn your React app into a Progressive Web App (PWA).

1.  **Install Vite PWA Plugin**:
    ```bash
    npm install vite-plugin-pwa -D
    ```
2.  **Update `vite.config.ts`**:
    ```typescript
    import { VitePWA } from 'vite-plugin-pwa'
    // ... inside plugins array:
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Debtsify Loan Manager',
          short_name: 'Debtsify',
          theme_color: '#ffffff',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ]
    ```
3.  **Add Icons**: You need to add icon files to your `public` folder.

---

## 3. Native Mobile App (Advanced)

If you strictly need an `.apk` file (Android) or appear in the Apple App Store, you can "wrap" your existing React app using **Capacitor**.

1.  **Initialize Capacitor**:
    ```bash
    npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
    npx cap init
    ```
2.  **Build your React App**:
    ```bash
    npm run build
    ```
3.  **Add Platforms**:
    ```bash
    npx cap add android
    # npx cap add ios (requires generic Mac)
    ```
4.  **Sync**:
    ```bash
    npx cap sync
    ```
5.  **Open in Android Studio**:
    ```bash
    npx cap open android
    ```
    - From Android Studio, you can run it on an emulator or build a signed `.apk` file to share with others.

**Recommendation**: Start with Option 2 ("Add to Home Screen"). Use Option 3 only if you really need to distribute an APK file manually.
