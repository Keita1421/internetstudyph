# Firebase Firestore Setup Guide

## 🔥 Your site is now configured for Firebase Firestore!

Both `hosted.html` and `results.html` are ready. You just need to set up Firebase and paste your config.

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Name it (e.g., "celina-isp-study")
4. Disable Google Analytics (optional)
5. Click **"Create"**

---

## Step 2: Enable Firestore Database

1. In your Firebase project, click **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for now)
4. Select a location (e.g., `asia-southeast1` for Philippines)
5. Click **"Enable"**

---

## Step 3: Set Firestore Security Rules

Once enabled, go to **"Rules"** tab and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> ⚠️ **Note:** These rules allow anyone to read/write. For production, add validation rules to prevent abuse.

Click **"Publish"** to save.

---

## Step 4: Get Your Firebase Config

1. Go to **Project Settings** (gear icon, top left)
2. Scroll down to **"Your apps"**
3. Click the **web icon** (`</>`) to add a web app
4. Give it a nickname (e.g., "ISP Study Site")
5. **Don't** check "Firebase Hosting"
6. Click **"Register app"**
7. Copy the `firebaseConfig` object

It will look like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## Step 5: Update Your HTML Files

### In both `hosted.html` and `results.html`:

Search for:

```javascript
// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  ...
```

Replace with your **actual config** from Step 4.

---

## ✅ That's It!

- **hosted.html**: Now saves submissions to Firestore instead of localStorage
- **results.html**: Fetches data from Firestore and auto-refreshes every 30 seconds

### Test It:

1. Open `hosted.html` in your browser
2. Submit a speed test result
3. Open `results.html` — you should see the new submission!

---

## 🔐 Production Security (Optional)

For a public site, improve your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{docId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['isp', 'downloadSpeed', 'uploadSpeed', 'ping', 'jitter', 'timestamp'])
                    && request.resource.data.downloadSpeed >= 0
                    && request.resource.data.uploadSpeed >= 0
                    && request.resource.data.ping >= 0
                    && request.resource.data.jitter >= 0;
      allow update, delete: if false;
    }
  }
}
```

This prevents bad data and blocks updates/deletes.

---

## 📊 View Your Data

Go to Firebase Console → Firestore Database → `submissions` collection

You'll see all submitted speed test results in real-time!
