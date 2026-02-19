# Quiz Application - Serverless Firebase

A serverless quiz application built with Angular and Firebase, featuring Firestore database and Cloud Storage for media files.

## Architecture

- **Frontend**: Angular 19 standalone components
- **Database**: Cloud Firestore
- **File Storage**: Google Cloud Storage
- **Hosting**: Firebase Hosting (GCP)
- **Models**: TypeScript interfaces and types (in `src/app/models/`)

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── components/    # Angular components
│   │   ├── services/      # Firebase services
│   │   ├── models/        # TypeScript interfaces and types
│   │   └── guards/        # Route guards
│   ├── assets/            # Static assets (images, sounds)
│   └── environments/      # Environment configuration
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── storage.rules          # Cloud Storage security rules
└── package.json           # Project dependencies
```

## Setup

### 1. Clone the repository

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

Follow the detailed instructions in [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to:
- Create a Firebase project
- Enable Firestore and Cloud Storage
- Install and configure Firebase CLI
- Update environment files with your Firebase configuration

### 4. Update Environment Configuration

Edit the following files with your Firebase configuration:
- `src/environments/environment.development.ts` (for development)
- `src/environments/environment.ts` (for production)

Replace the placeholder values with your actual Firebase config from the Firebase Console.

## Development

### Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:4200`.

### Build for Production

```bash
npm run build
```

This builds the Angular application for production deployment.

## Deployment

### Deploy Everything

```bash
npm run deploy
```

This builds the application and deploys it to Firebase Hosting along with Firestore and Storage rules.

### Deploy Only Hosting

```bash
npm run deploy:hosting
```

### Deploy Only Security Rules

```bash
npm run deploy:rules
```

## Data Model

### Collections

- **rounds**: Quiz rounds with audio and background images
  - `id`: string (auto-generated)
  - `name`: string
  - `order`: number
  - `audioUrl`: string (Cloud Storage URL)
  - `backgroundImageUrl`: string (Cloud Storage URL)

- **questions**: Quiz questions
  - `id`: string (auto-generated)
  - `text`: string
  - `explanation`: string
  - `category`: string
  - `introduction`: string
  - `order`: number
  - `imageUrl`: string (Cloud Storage URL)
  - `roundId`: string (reference to round)

- **answers**: Possible answers for questions
  - `id`: string (auto-generated)
  - `text`: string
  - `isCorrect`: boolean
  - `imageUrl`: string (Cloud Storage URL)
  - `order`: number
  - `questionId`: string (reference to question)

### Cloud Storage Structure

```
/audio/rounds/          # Audio files for rounds
/images/rounds/         # Background images for rounds
/images/questions/      # Images for questions
/images/answers/        # Images for answers
```

## Available Scripts

- `npm start` - Start development server (port 4200)
- `npm run build` - Build for production
- `npm run watch` - Build in watch mode for development
- `npm test` - Run tests
- `npm run deploy` - Build and deploy to Firebase
- `npm run deploy:hosting` - Deploy only hosting
- `npm run deploy:rules` - Deploy only Firestore and Storage rules

## Firebase CLI Commands

```bash
# Login to Firebase
firebase login

# View project info
firebase projects:list

# Deploy
firebase deploy

# View logs
firebase functions:log

# Open Firebase Console
firebase open
```

## Migrating from PostgreSQL

If you have existing data in the old PostgreSQL database, see [MIGRATION.md](MIGRATION.md) for instructions on how to export and import your data to Firestore.

## Security

The current Firestore and Storage security rules allow open read/write access for development. **Before deploying to production**, update the rules in `firestore.rules` and `storage.rules` to restrict access appropriately.

Consider implementing Firebase Authentication to secure your data.

## Troubleshooting

### Build Errors

If you encounter build errors, try:

```bash
# Clean install
rm -rf node_modules .angular
npm install
```

### Firebase Deployment Errors

Make sure you're logged in and have selected the correct project:

```bash
firebase login
firebase use --add
```

### Environment Configuration

Make sure your `src/environments/environment.ts` and `environment.development.ts` files contain valid Firebase configuration.

## License

Private project