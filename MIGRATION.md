# Data Migration Guide: PostgreSQL to Firestore

This guide explains how to migrate your existing quiz data from PostgreSQL to Cloud Firestore.

## Overview

The migration involves:
1. Exporting data from PostgreSQL
2. Uploading media files (images, audio) to Cloud Storage
3. Importing data to Firestore with updated file URLs

## Prerequisites

- Access to the old PostgreSQL database
- Firebase project set up with Firestore and Cloud Storage enabled
- Firebase CLI installed and authenticated
- Node.js installed

## Step 1: Export Data from PostgreSQL

### Option A: Using pg_dump (Full Database)

```bash
cd docker
docker-compose exec postgres pg_dump -U postgres quiz > quiz_backup.sql
```

### Option B: Export as JSON (Recommended for migration)

Create a script to export data as JSON. Here's an example Node.js script:

```javascript
// export-data.js
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'quiz'
});

async function exportData() {
  await client.connect();
  
  // Export rounds
  const rounds = await client.query('SELECT * FROM rounds ORDER BY "order"');
  fs.writeFileSync('rounds.json', JSON.stringify(rounds.rows, null, 2));
  
  // Export questions
  const questions = await client.query('SELECT * FROM questions ORDER BY "order"');
  fs.writeFileSync('questions.json', JSON.stringify(questions.rows, null, 2));
  
  // Export answers
  const answers = await client.query('SELECT * FROM answers ORDER BY "order"');
  fs.writeFileSync('answers.json', JSON.stringify(answers.rows, null, 2));
  
  await client.end();
  console.log('Data exported successfully!');
}

exportData().catch(console.error);
```

Run the script:

```bash
npm install pg
node export-data.js
```

## Step 2: Upload Media Files to Cloud Storage

### Extract and Upload Images

Images are stored as bytea (Buffer) in PostgreSQL. You need to extract them and upload to Cloud Storage.

```javascript
// upload-images.js
const { Client } = require('pg');
const { initializeApp } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');

// Initialize Firebase Admin
initializeApp();
const bucket = getStorage().bucket();

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'quiz'
});

async function uploadImages() {
  await client.connect();
  
  // Upload question images
  const questions = await client.query('SELECT id, image, "imageMimeType" FROM questions WHERE image IS NOT NULL');
  for (const q of questions.rows) {
    const filename = `images/questions/${q.id}.${q.imageMimeType.split('/')[1]}`;
    const file = bucket.file(filename);
    await file.save(q.image, { contentType: q.imageMimeType });
    console.log(`Uploaded question image: ${filename}`);
  }
  
  // Upload answer images
  const answers = await client.query('SELECT id, image, "imageMimeType" FROM answers WHERE image IS NOT NULL');
  for (const a of answers.rows) {
    const filename = `images/answers/${a.id}.${a.imageMimeType.split('/')[1]}`;
    const file = bucket.file(filename);
    await file.save(a.image, { contentType: a.imageMimeType });
    console.log(`Uploaded answer image: ${filename}`);
  }
  
  await client.end();
  console.log('Images uploaded successfully!');
}

uploadImages().catch(console.error);
```

### Upload Audio Files

If audio files are stored on disk (referenced by path), upload them:

```bash
# Upload all audio files to Cloud Storage
firebase storage:upload audio/rounds/ --prefix audio/rounds/
```

## Step 3: Import Data to Firestore

Create a script to import the JSON data to Firestore:

```javascript
// import-to-firestore.js
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');

initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket();

async function importData() {
  // Import rounds
  const rounds = JSON.parse(fs.readFileSync('rounds.json', 'utf8'));
  for (const round of rounds) {
    const audioUrl = round.audioPath 
      ? await bucket.file(`audio/rounds/${round.audioPath}`).getSignedUrl({ action: 'read', expires: '03-01-2500' })
      : null;
    
    const backgroundImageUrl = round.backgroundImagePath
      ? await bucket.file(`images/rounds/${round.backgroundImagePath}`).getSignedUrl({ action: 'read', expires: '03-01-2500' })
      : null;
    
    await db.collection('rounds').doc(round.id).set({
      name: round.name,
      order: round.order,
      audioUrl: audioUrl?.[0],
      backgroundImageUrl: backgroundImageUrl?.[0],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Imported round: ${round.name}`);
  }
  
  // Import questions
  const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
  for (const question of questions) {
    const imageUrl = question.image
      ? await bucket.file(`images/questions/${question.id}.${question.imageMimeType.split('/')[1]}`).getSignedUrl({ action: 'read', expires: '03-01-2500' })
      : null;
    
    await db.collection('questions').doc(question.id).set({
      text: question.text,
      explanation: question.explanation,
      category: question.category,
      introduction: question.introduction,
      order: question.order,
      imageUrl: imageUrl?.[0],
      roundId: question.roundId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Imported question: ${question.text.substring(0, 50)}...`);
  }
  
  // Import answers
  const answers = JSON.parse(fs.readFileSync('answers.json', 'utf8'));
  for (const answer of answers) {
    const imageUrl = answer.image
      ? await bucket.file(`images/answers/${answer.id}.${answer.imageMimeType.split('/')[1]}`).getSignedUrl({ action: 'read', expires: '03-01-2500' })
      : null;
    
    await db.collection('answers').doc(answer.id).set({
      text: answer.text,
      isCorrect: answer.isCorrect,
      order: answer.order,
      imageUrl: imageUrl?.[0],
      questionId: answer.questionId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Imported answer: ${answer.text.substring(0, 50)}...`);
  }
  
  console.log('Data import completed!');
}

importData().catch(console.error);
```

Run the import:

```bash
npm install firebase-admin
node import-to-firestore.js
```

## Step 4: Verify Migration

1. Open Firebase Console
2. Navigate to Firestore Database
3. Verify all collections (rounds, questions, answers) have data
4. Navigate to Cloud Storage
5. Verify all media files are uploaded
6. Test the application to ensure everything works

## Step 5: Update Security Rules

After migration, update your Firestore and Storage security rules to restrict access:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null; // Require authentication for writes
    }
  }
}
```

Deploy the updated rules:

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Rollback Plan

If you need to rollback:

1. Keep the PostgreSQL database running until you're confident in the migration
2. Keep the Docker setup intact
3. You can restore the backend from git history if needed

## Notes

- The old backend and database can be removed after successful migration and testing
- Consider implementing Firebase Authentication for better security
- Update your security rules before going to production
- Media file URLs from Cloud Storage are permanent and won't change unless you delete the files

## Troubleshooting

### Issue: Images not displaying

- Check that the Cloud Storage URLs are correct
- Verify the files were uploaded successfully in Firebase Console
- Check browser console for CORS errors

### Issue: Firestore permission denied

- Verify your security rules allow the operation
- Check that you're authenticated if rules require it

### Issue: Large dataset import fails

- Import data in batches
- Use Firestore batch writes (max 500 operations per batch)
- Consider using the Firebase Admin SDK for bulk imports
