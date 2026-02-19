# Quick Firebase Setup (Without Cloud Storage)

## What I've Done

✅ Updated `.firebaserc` with your project ID: `quiz-d36a3`  
✅ Updated environment files with your Firebase configuration  
✅ Disabled Cloud Storage in the app (not available in free tier)  
✅ Updated `firebase.json` to remove storage configuration

## Complete the Firebase Init

The `firebase init` command is currently running. Here's what to select:

### Step 1: Select Features
Use **Space** to select, **Enter** to confirm:
- ✅ **Firestore** (select this)
- ✅ **Hosting** (select this)
- ❌ **Storage** (do NOT select - not available in free tier)

### Step 2: Project Setup
- Select: **Use an existing project**
- Choose: **quiz-d36a3**

### Step 3: Firestore Rules
- Press **Enter** to accept default: `firestore.rules`

### Step 4: Firestore Indexes
- Press **Enter** to accept default: `firestore.indexes.json`

### Step 5: Hosting Public Directory
- Enter: `frontend/dist/frontend/browser`

### Step 6: Single-page App
- Enter: **y** (yes)

### Step 7: Automatic Builds
- Enter: **N** (no)

### Step 8: Overwrite index.html
- Enter: **N** (no)

## After Firebase Init Completes

### Test the Build

```bash
# Build the shared package
npm run build:shared

# Try to build the frontend
npm run build:frontend
```

### Start Development Server

```bash
npm run start:frontend
```

The app will run on `http://localhost:4200`.

## Important Notes

### Cloud Storage is Disabled

Since Cloud Storage is not available in the free tier, file uploads (images, audio) will not work. The app will show errors when trying to upload files.

**To enable Cloud Storage later:**
1. Upgrade to Firebase Blaze plan (pay-as-you-go)
2. Enable Cloud Storage in Firebase Console
3. Uncomment the Storage provider in `frontend/src/app/app.config.ts`
4. Restore the full `StorageService` implementation
5. Add storage config back to `firebase.json`

### Workaround for Now

You can still use the app for testing Firestore operations (CRUD for rounds, questions, answers) but without file uploads. To test with images/audio:

**Option 1**: Use external URLs
- Instead of uploading files, use URLs to images/audio hosted elsewhere (e.g., Imgur, Google Drive public links)

**Option 2**: Store small images as base64 in Firestore
- Not recommended for production, but works for testing
- Would require modifying the models to accept base64 strings

**Option 3**: Upgrade to Blaze plan
- Most straightforward solution
- Pay-as-you-go pricing (very cheap for small apps)
- Free tier still applies, you only pay for usage above free limits

## Next Steps

1. Complete the `firebase init` command with the selections above
2. Run `npm run build:shared`
3. Run `npm run build:frontend` to test the build
4. Run `npm run start:frontend` to test locally
5. Deploy with `npm run deploy` when ready

## Troubleshooting

### Build Errors
If you get TypeScript errors, run:
```bash
npm run build:shared
```

### Firebase Deploy Errors
Make sure you're logged in:
```bash
firebase login
firebase projects:list  # Should show quiz-d36a3
```

### Runtime Errors
Check the browser console. Most errors will be related to missing Cloud Storage, which is expected.
