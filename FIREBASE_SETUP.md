# Firebase Project Setup Guide

This guide walks you through setting up a Firebase project for your quiz application.

## Prerequisites

- A Google account
- Node.js and npm installed on your machine

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "quiz-app" or "123-quiz")
4. Click **Continue**
5. (Optional) Enable Google Analytics if you want usage tracking
6. Click **Create project**
7. Wait for the project to be created, then click **Continue**

## Step 2: Register Your Web App

1. In the Firebase Console, click the **Web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "Quiz Frontend")
3. **Check** the box for "Also set up Firebase Hosting"
4. Click **Register app**
5. You'll see your Firebase configuration object - **SAVE THIS**, you'll need it later:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Click **Continue to console**

## Step 3: Enable Firestore Database

1. In the left sidebar, click **Build** → **Firestore Database**
2. Click **Create database**
3. Select **Start in test mode** (we'll add security rules later)
4. Choose a Firestore location (select one close to your users, e.g., `europe-west` for Europe)
5. Click **Enable**

## Step 4: Enable Cloud Storage

1. In the left sidebar, click **Build** → **Storage**
2. Click **Get started**
3. Select **Start in test mode** (we'll add security rules later)
4. Click **Next**
5. Choose a storage location (should match your Firestore location)
6. Click **Done**

## Step 5: Install Firebase CLI

Open your terminal and install the Firebase CLI globally:

```bash
npm install -g firebase-tools
```

## Step 6: Login to Firebase CLI

```bash
firebase login
```

This will open a browser window for you to authenticate with your Google account.

## Step 7: Initialize Firebase in Your Project

Navigate to your project directory and run:

```bash
cd /Users/larsanderegg/dev/prv/123-quiz
firebase init
```

When prompted:

1. **Which Firebase features?** Select:
   - ✅ Firestore
   - ✅ Hosting
   - ✅ Storage

2. **Use an existing project or create a new one?** Select **"Use an existing project"**

3. **Select your project** from the list

4. **Firestore Rules:** Press Enter to accept default (`firestore.rules`)

5. **Firestore Indexes:** Press Enter to accept default (`firestore.indexes.json`)

6. **Storage Rules:** Press Enter to accept default (`storage.rules`)

7. **Public directory:** Enter `frontend/dist/frontend/browser`
,
8. **Configure as single-page app?** Enter **`y`** (yes)

9. **Set up automatic builds?** Enter **`N`** (no)

10. **Overwrite index.html?** Enter **`N`** (no)

## Step 8: Update Environment Files

After the migration code is complete, you'll need to add your Firebase configuration to the environment files:

**File:** `frontend/src/environments/environment.development.ts`

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

**File:** `frontend/src/environments/environment.ts`

```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

Replace the placeholder values with your actual Firebase configuration from Step 2.

## Step 9: Update Security Rules (After Testing)

Once you've tested that everything works, update your security rules for production:

### Firestore Rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all users
    match /{document=**} {
      allow read: if true;
    }
    
    // Only allow writes from authenticated users (add auth later)
    // For now, allow all writes for testing
    match /{document=**} {
      allow write: if true;
    }
  }
}
```

### Storage Rules (`storage.rules`)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true; // Restrict this in production
    }
  }
}
```

Deploy the rules:

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Step 10: Deploy Your Application

After the migration is complete and tested locally:

```bash
# Build the frontend
npm run build:frontend

# Deploy to Firebase Hosting
firebase deploy
```

Your app will be available at: `https://YOUR_PROJECT_ID.web.app`

## Useful Firebase CLI Commands

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage:rules

# View your project in the browser
firebase open hosting:site

# View logs
firebase functions:log
```

## Next Steps

1. Complete the setup steps above
2. Save your Firebase configuration
3. The migration code will be implemented automatically
4. Test locally before deploying
5. Deploy to Firebase Hosting

## Troubleshooting

**Issue:** `firebase: command not found`
- **Solution:** Make sure Firebase CLI is installed globally: `npm install -g firebase-tools`

**Issue:** Permission errors during deployment
- **Solution:** Run `firebase login` again to re-authenticate

**Issue:** Build fails with "Cannot find module"
- **Solution:** Run `npm install` in the root directory and `npm run build:shared` first

**Issue:** Firestore permission denied
- **Solution:** Check your Firestore rules in the Firebase Console
