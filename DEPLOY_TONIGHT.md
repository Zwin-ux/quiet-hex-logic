# 🚀 FINAL DEPLOYMENT CHECKLIST - TONIGHT

## ✅ CODE IS READY

- [x] Expo configured with app.json and eas.json
- [x] In-App Purchases bridge implemented
- [x] Sign In with Apple integrated
- [x] Stripe hidden on iOS (App Store compliant)
- [x] Assets (icon + splash) configured
- [x] Home page updated with Jan 25th/Feb 25th dates
- [x] Discord link added

## 🍎 APPLE DEVELOPER PORTAL (DO THIS NOW)

### 1. Register App ID (5 min)

```
1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Click [+] > App IDs > App
3. Description: "Hexology"
4. Bundle ID: com.zwin.hexology
5. Check: Sign In with Apple, In-App Purchase
6. Click Register
```

### 2. Banking & Tax (10 min)

```
1. Go to: https://appstoreconnect.apple.com/agreements
2. Click "Paid Apps" > View Terms > Accept
3. Click "Set Up Banking"
4. Enter your bank account info
5. Fill out tax form (W-9 if US, W-8BEN if not)
6. WAIT until status shows "Active" (can take 24-48 hours)
```

### 3. Create App Record (5 min)

```
1. Go to: https://appstoreconnect.apple.com/apps
2. Click [+] > New App
3. Platforms: iOS (check macOS/visionOS if you want)
4. Name: Hexology
5. Bundle ID: com.zwin.hexology
6. SKU: hexology_2026_01
7. Click Create
```

### 4. Set Up In-App Purchase (10 min)

```
1. In your app > In-App Purchases > Manage
2. Click [+] > Auto-Renewable Subscription
3. Reference Name: Hexology Plus
4. Product ID: hexology_plus_monthly
5. Price: $5.00/month
6. Add localization: "Hexology Plus" with description
7. Save
```

### 5. Upload Screenshots (5 min)

```
1. In your app > Previews and Screenshots
2. Drag the 4 screenshots I captured to iPhone section
3. Drag same screenshots to iPad section
4. Apple will auto-resize
```

### 6. Fill Out Metadata (10 min)

```
Copy/paste from: store_assets/APP_STORE_METADATA.md
- Description
- Keywords
- Promotional Text
- Support URL: https://hexology.me/support (legacy)
- Privacy URL: https://hexology.me/privacy (legacy)
```

## 📱 BUILD & SUBMIT (DO AFTER APPLE SETUP)

### 7. Run EAS Build

```powershell
cd c:\Users\mzwin\quiet-hex-logic-2
npx eas build --platform ios
```

- Login with your Apple ID when prompted
- EAS will handle certificates automatically
- Build takes ~15-20 minutes

### 8. Submit for Review

```
1. Wait for build to finish
2. In App Store Connect, select the build
3. Click "Submit for Review"
4. Answer questions (No ads, No third-party content, etc.)
5. Submit!
```

## ⚠️ CRITICAL BLOCKERS

### Banking MUST be "Active"

- If banking isn't active, IAP won't work
- This can take 24-48 hours after you submit bank info
- You can still build the app, but can't test IAP until this is done

### Supabase Apple Auth

- Go to Supabase Dashboard > Auth > Providers > Apple
- You'll need to create an Apple Service ID and upload a .p8 key
- Instructions: https://supabase.com/docs/guides/auth/social-login/auth-apple

## 🎯 TONIGHT'S GOAL

1. ✅ Complete Apple Developer Portal setup (Steps 1-6) - 45 min
2. ✅ Run `npx eas build --platform ios` - 20 min
3. ✅ Submit for review - 10 min

**Total time: ~75 minutes**

Apple review typically takes 24-48 hours. You'll be live by the weekend!
