# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a quiz application monorepo with three workspaces:
- **backend**: NestJS REST API with TypeORM (port 3000)
- **frontend**: Angular standalone component application (port 4200)
- **shared**: TypeScript package containing shared TypeORM entities, enums, and types

The application manages quiz rounds, questions, answers, and LED control modes for a quiz system.

## Essential Commands

### Initial Setup
```bash
npm install                           # Install all workspace dependencies
cd docker && docker-compose up -d     # Start PostgreSQL database
cp .env.development .env              # Create environment file (if needed)
```

### Development
```bash
npm run start:backend:dev             # Backend with auto-rebuild on changes
npm run start:frontend                # Frontend dev server with hot reload
```

Note: Backend runs `build:shared && build:backend` before starting, so shared changes are automatically picked up.

### Building
```bash
npm run build:shared                  # Build shared package (must build first)
npm run build:backend                 # Build backend (depends on shared)
npm run build:frontend                # Build frontend
npm run build                         # Build all three workspaces in order
```

### Testing
```bash
# Backend tests (Jest)
npm run test:backend                  # Run all backend tests
npm run test:backend -- --watch       # Run tests in watch mode
npm run test:backend -- path/to/test.spec.ts    # Run single test file
npm run test:backend -- --coverage    # Run with coverage

# Frontend tests (Karma/Jasmine)
npm run test:frontend                 # Run all frontend tests
```

### Linting and Formatting
```bash
# Backend only (no frontend linting configured)
cd backend && npm run lint            # ESLint with auto-fix
cd backend && npm run format          # Prettier formatting
```

## Architecture

### Workspace Dependencies

The build order matters due to workspace dependencies:
1. **shared** must be built first (produces `dist/` output)
2. **backend** depends on `@quiz/shared` (via tsconfig paths: `@quiz/shared` → `../shared/src`)
3. **frontend** also imports from `@quiz/shared`

When modifying shared entities, always rebuild shared before building/running dependent workspaces.

### Database Architecture

**TypeORM Entities** (all defined in `shared/src/entities/`):

- **Round**: Quiz rounds with audio and background images
  - Contains: name, order, audioPath, backgroundImagePath
  - Has many Questions (one-to-many)

- **Question**: Individual quiz questions
  - Contains: text, explanation, category, introduction, order, image (bytea), imageMimeType
  - Belongs to one Round (many-to-one)
  - Has many Answers (one-to-many with cascade)

- **Answer**: Possible answers for questions
  - Contains: text, isCorrect, image (bytea), imageMimeType, order
  - Belongs to one Question (many-to-one)

**Key Database Notes**:
- Uses UUID primary keys (`@PrimaryGeneratedColumn('uuid')`)
- Images stored as `bytea` (Buffer) with corresponding mimeType fields
- Auto-synchronization enabled in development (`synchronize: true` when `NODE_ENV !== 'production'`)
- Database connection configured via environment variables (POSTGRES_HOST, POSTGRES_PORT, etc.)

### Backend Architecture

NestJS modules (all in `backend/src/`):
- **QuestionsModule**: CRUD for questions with image upload support
- **AnswersModule**: CRUD for answers
- **RoundsModule**: CRUD for quiz rounds
- **LedControlModule**: LED control API (modes: OFF, ALL, BLINK, ONE, TWO, THREE)

**Important Backend Notes**:
- Uses ES modules (`"type": "module"` in package.json)
- All imports must use `.js` extensions (TypeScript ES module requirement)
- CORS enabled in `main.ts`
- Runs on port 3000 (configurable via PORT env var)
- Uses `--watch` mode with Node's built-in watcher for auto-reload

### Frontend Architecture

Angular 19 standalone components (no NgModules):

**Routes** (`frontend/src/app/app.routes.ts`):
- `/quiz/start`: Quiz start screen
- `/quiz/:roundId/start`: Round start screen
- `/quiz/:roundId/play`: Quiz player interface
- `/manage/questions`: Question list and CRUD
- `/manage/rounds`: Round list and CRUD

**Services**:
- `QuestionService`: HTTP client for question API
- `RoundService`: HTTP client for round API
- `LedControlService`: HTTP client for LED control API

**Components**:
- Quiz flow: `QuizStartComponent` → `RoundStartComponent` → `QuizPlayerComponent`
- Management: `QuestionListComponent`, `QuestionFormComponent`, `RoundListComponent`, `RoundFormComponent`

### Module Import Pattern

When importing from the shared package in backend/frontend:
```typescript
import { Question, Answer, Round, LedControlMode } from '@quiz/shared';
```

In backend files, remember the `.js` extension requirement for relative imports:
```typescript
import { SomeService } from './some.service.js';
```

## Environment Configuration

Required environment variables (see `docker/.env` for reference):
- `POSTGRES_HOST`: Database host (default: localhost)
- `POSTGRES_PORT`: Database port (default: 5432)
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name
- `PORT`: Backend API port (default: 3000)

## Docker Database

PostgreSQL 15 runs in Docker:
```bash
cd docker
docker-compose up -d              # Start database
docker-compose down               # Stop database
docker-compose down -v            # Stop and remove volumes (data loss!)
```

Database includes `init.sql` for initial schema setup. Data persists in `postgres_data` volume.