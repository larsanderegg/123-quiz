# Quiz Monorepo

This is a monorepo project containing a NestJS backend and Angular frontend.

## Project Structure

```
.
├── backend/         # NestJS backend application
├── frontend/        # Angular frontend application
├── docker/          # Docker configuration for PostgreSQL
└── package.json     # Root package.json with workspace configuration
```

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Docker and Docker Compose
- PostgreSQL (via Docker)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start PostgreSQL using Docker:
   ```bash
   cd docker
   docker-compose up -d
   ```

4. Copy the environment file:
   ```bash
   cp .env.development .env
   ```

## Development

### Backend

The backend is a NestJS application running on port 3000.

```bash
# Start the backend
npm run start:backend

# Start the backend in watch mode
npm run start:backend:dev
```

### Frontend

The frontend is an Angular application running on port 4200.

```bash
# Start the frontend
npm run start:frontend
```

## Environment Configuration

The project uses environment variables for configuration. Create a `.env` file based on `.env.development` for local development.

## Database

The PostgreSQL database runs in Docker. The configuration is in `docker/docker-compose.yml`.

## Production

For production deployment, make sure to:

1. Set `NODE_ENV=production`
2. Use appropriate environment variables
3. Build both frontend and backend:
   ```bash
   npm run build:frontend
   npm run build:backend
   ``` 