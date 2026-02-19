# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a serverless quiz application built with Angular and Firebase. The application was migrated from a NestJS/PostgreSQL monorepo to a Firebase-based architecture.

- **Frontend**: Angular 20 standalone components (no NgModules)
- **Database**: Cloud Firestore
- **File Storage**: Google Cloud Storage
- **Authentication**: Firebase Authentication with Google Sign-In
- **Hosting**: Firebase Hosting (GCP)
- **Models**: TypeScript interfaces and types in `src/app/models/`

The application manages quiz rounds, questions, answers, and LED control modes for a quiz system with role-based access (authenticated users and admins).

## Essential Commands

### Development
```bash
npm start                         # Start dev server (port 4200)
npm run watch                     # Build in watch mode
```

### Building
```bash
npm run build                     # Build for production (outputs to public/)
```

### Testing
```bash
npm test                          # Run all tests (Karma/Jasmine)
```

### Deployment
```bash
npm run deploy                    # Build and deploy everything to Firebase
npm run deploy:hosting            # Deploy only hosting
npm run deploy:rules              # Deploy only Firestore and Storage rules
```

### Firebase CLI Commands
```bash
firebase login                    # Authenticate with Firebase
firebase projects:list            # List available projects
firebase deploy                   # Deploy all Firebase resources
firebase deploy --only hosting    # Deploy only hosting
firebase deploy --only firestore:rules,storage:rules
firebase open                     # Open Firebase Console
```

## Architecture

### Data Model

All data stored in Cloud Firestore collections:

**Collections**:
- `users`: User profiles with admin flags (uid, email, displayName, photoURL, isAdmin)
- `rounds`: Quiz rounds (name, order, audioUrl, backgroundImageUrl)
- `questions`: Quiz questions (text, explanation, category, introduction, order, imageUrl, roundId)
- `answers`: Possible answers (text, isCorrect, order, imageUrl, questionId)

**Key Notes**:
- All collections use auto-generated document IDs
- Images and audio stored in Cloud Storage, referenced by URL in Firestore documents
- Legacy properties (`image`, `imageMimeType`, `audioPath`, `backgroundImagePath`) exist for backward compatibility but should not be used in new code
- All documents include `createdAt` and `updatedAt` timestamp fields

### Cloud Storage Structure

```
/audio/rounds/          # Audio files for rounds
/images/rounds/         # Background images for rounds
/images/questions/      # Images for questions
/images/answers/        # Images for answers
```

### Frontend Architecture

**Angular 20 Standalone Components** (no NgModules):

**Routes** (`src/app/app.routes.ts`):
- `/login`: Login page
- `/unauthorized`: Access denied page
- `/quiz/start`: Quiz start screen (authenticated users only)
- `/quiz/:roundId/start`: Round start screen (authenticated users only)
- `/quiz/:roundId/play`: Quiz player interface (authenticated users only)
- `/manage/questions`: Question list and CRUD (admin only)
- `/manage/rounds`: Round list and CRUD (admin only)

**Services** (`src/app/services/`):
- `AuthService`: Firebase Authentication, Google Sign-In with redirect, user profile management
- `QuestionService`: Firestore CRUD for questions and answers, integrated image upload
- `RoundService`: Firestore CRUD for rounds, integrated audio/image upload
- `StorageService`: Cloud Storage file upload/delete operations
- `LedControlService`: LED control API (modes: OFF, ALL, BLINK, ONE, TWO, THREE)

**Guards** (`src/app/guards/`):
- `authGuard`: Requires Firebase Authentication
- `adminGuard`: Requires admin role (checked via Firestore user profile)

**Models** (`src/app/models/`):
- TypeScript interfaces for Round, Question, Answer, User, UserProfile, LedControlMode
- Input types omit auto-generated fields (`id`, `createdAt`, `updatedAt`)

### Authentication and Authorization

**Authentication**: Firebase Authentication with Google Sign-In
- Uses `signInWithRedirect` to avoid COOP issues
- User must exist in Firestore `users` collection to access the app
- `AuthService.handleRedirectResult()` called on app initialization to complete sign-in

**Authorization**: Role-based via Firestore security rules
- All authenticated users can read data and play quizzes
- Only users with `isAdmin: true` in their Firestore user document can access management routes
- Security rules enforce server-side validation of all read/write operations

**User Management**:
- Admins must pre-create user documents in Firestore with `isAdmin` flag
- New users attempting to sign in without a pre-created document will be denied access
- User profiles stored in `users/{uid}` with fields: uid, email, displayName, photoURL, isAdmin

### Firestore Security Rules

Located in `firestore.rules`. Key patterns:
- Helper functions: `isAuthenticated()`, `userExists()`, `isAdmin()`, `isOwner(userId)`
- Validation functions: Field type checking, string length limits, timestamp validation, storage URL validation
- All collections require authentication to read
- Only admins can create/update/delete quiz data (rounds, questions, answers)
- Users can only read their own profile; admins can manage all users
- Strict field validation on all write operations

### Service Patterns

**QuestionService** complex operations:
- `saveQuestionWithAnswers()`: Comprehensive method handling create/update of questions with answers and image uploads
- Handles cascading deletes (deletes associated images from Storage)
- Manages answer creation/update/deletion in edit mode
- Uses RxJS operators extensively: `switchMap`, `forkJoin`, `map`, `take(1)`

**StorageService** utilities:
- `uploadFile(file, path)`: Upload file and return download URL
- `deleteFile(path)`: Delete file from storage
- `generateUniquePath(fileName, folder)`: Create unique path with timestamp
- `getPathFromUrl(url)`: Extract storage path from download URL

## Environment Configuration

**Firebase Configuration Files**:
- `src/environments/environment.ts`: Production config
- `src/environments/environment.development.ts`: Development config

Both files must contain:
```typescript
export const environment = {
  production: boolean,
  firebase: {
    apiKey: string,
    authDomain: string,
    projectId: string,
    storageBucket: string,
    messagingSenderId: string,
    appId: string
  }
};
```

Get configuration values from Firebase Console → Project Settings → General → Your apps.

## Firebase Setup

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for complete Firebase project setup instructions.

Key setup steps:
1. Create Firebase project in console
2. Enable Firestore and Cloud Storage
3. Register web app and get config
4. Install Firebase CLI: `npm install -g firebase-tools`
5. Login: `firebase login`
6. Deploy: `npm run deploy`

## Migration Notes

This project was migrated from a NestJS/PostgreSQL/TypeORM architecture to Firebase. See [MIGRATION.md](MIGRATION.md) for data migration scripts and process.

**Legacy Properties**: Some models retain deprecated properties (e.g., `image`, `imageMimeType`, `audioPath`) for backward compatibility. New code should only use `imageUrl` and `audioUrl` properties with Cloud Storage URLs.

## Important Development Notes

### Working with Firestore Queries

- Avoid using `orderBy()` with `where()` in Firestore queries unless a composite index exists
- Instead, query without `orderBy` and sort in-memory with `.sort()` in the RxJS pipe
- See `QuestionService.getAllQuestionsByRound()` and `getAnswersByQuestion()` for examples

### RxJS Patterns

- Always use `.pipe(take(1))` on Firestore observables to prevent memory leaks
- Use `switchMap` for dependent operations (e.g., create then upload image)
- Use `forkJoin` for parallel operations (e.g., deleting multiple files)
- Use `from()` to convert Promises to Observables

### Firebase Storage URLs

- Storage URLs are permanent and won't change unless files are deleted
- Extract storage paths from URLs using `StorageService.getPathFromUrl()`
- Always delete old files from storage when updating with new uploads

### Authentication Flow

1. User clicks "Sign in with Google" on `/login`
2. `AuthService.signInWithGoogle()` calls `signInWithRedirect()`
3. User redirected to Google, then back to app
4. `AuthService.handleRedirectResult()` (called in `LoginComponent.ngOnInit()`) checks if user document exists in Firestore
5. If user exists, redirect to `/quiz/start`; otherwise, sign out and show error

### Security Rules Testing

Before deploying production rules:
```bash
# Test rules locally with emulator
firebase emulators:start --only firestore

# Deploy rules without hosting
firebase deploy --only firestore:rules,storage:rules
```
