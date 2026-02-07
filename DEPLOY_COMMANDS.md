# 🚀 DEPLOY TO APP STORE - COMMANDS

## Step 1: Install EAS CLI (if not already installed)

```powershell
npm install -g eas-cli
```

## Step 2: Login to Expo

```powershell
eas login
```

- Enter your Expo account email/password
- If you don't have an Expo account, create one at https://expo.dev/signup

## Step 3: Configure the Project

```powershell
eas build:configure
```

- This will set up your project for EAS builds
- Select "All" when asked which platforms

## Step 4: Build for iOS (Production)

```powershell
eas build --platform ios --profile production
```

**What happens:**

1. EAS will ask you to log in to your Apple Developer account
2. It will automatically create/manage certificates and provisioning profiles
3. The build will run in the cloud (~15-20 minutes)
4. You'll get a download link when it's done

## Step 5: Submit to App Store

```powershell
eas submit --platform ios
```

**You'll need:**

- Apple ID (your developer account email)
- App-specific password (create at appleid.apple.com)
- The build ID from step 4

**OR manually submit:**

1. Download the `.ipa` file from the build
2. Use Transporter app (Mac) or Application Loader
3. Upload to App Store Connect

---

## 🔥 QUICK DEPLOY (All in one)

```powershell
# Login
eas login

# Build
eas build --platform ios --profile production

# Wait for build to complete, then submit
eas submit --platform ios --latest
```

---

## ⚠️ TROUBLESHOOTING

### "No bundle identifier found"

- Make sure `app.json` has `"bundleIdentifier": "com.zwin.hexology"` (legacy bundle id)

### "Apple Developer account not found"

- Run: `eas device:create` to register your Apple account
- Or go to https://expo.dev/accounts/[your-username]/settings/credentials

### "Provisioning profile error"

- Run: `eas credentials` to manage certificates manually
- Select iOS → Production → Manage credentials

---

## 📱 AFTER SUBMISSION

1. Go to https://appstoreconnect.apple.com
2. Select your app "The Open Board"
3. The build should appear in "TestFlight" section within 5-10 minutes
4. Click "Submit for Review" when ready
5. Fill out the App Store questionnaire
6. Wait 24-48 hours for Apple review

---

## 🎯 CURRENT STATUS CHECKLIST

- [x] Code is ready
- [x] app.json configured
- [x] eas.json configured
- [x] Assets (icon/splash) added
- [x] IAP implemented
- [x] Sign In with Apple added
- [ ] EAS CLI installed
- [ ] Logged into Expo
- [ ] Build started
- [ ] Build submitted to App Store

---

## 💡 TIPS

- **First build takes longer** (~20-30 min) because EAS sets up credentials
- **Subsequent builds** are faster (~10-15 min)
- **You can close the terminal** - build runs in the cloud
- **Check build status**: https://expo.dev/accounts/[your-username]/projects/hexology/builds (legacy project slug)
