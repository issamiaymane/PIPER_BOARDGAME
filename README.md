# PIPER - Speech Therapy Application

**P**ersonalized **I**EP **P**rogress & **E**valuation **R**eporter

An interactive speech therapy application featuring educational board games, therapist dashboards with AI-powered PDF extraction, and progress tracking for speech therapy professionals.

## Features

- **Interactive Board Game** - Educational speech therapy games with 141+ card categories
- **Therapist Dashboard** - Manage students, track progress, and generate IEP reports
- **AI-Powered Extraction** - Automatically extract evaluation data and goals from PDFs
- **Progress Tracking** - Monitor student performance and generate reports
- **Card Browser** - Browse and preview all therapy cards
- **Seasonal Themes** - Spring, Summer, Autumn, and Winter themes with persistent selection

## Project Structure

This is a **monorepo** with shared code between frontend and backend:

```
boardgame/
├── shared/                      # Shared code between frontend & backend
│   ├── categories.ts           # Category definitions & handler mappings
│   ├── cards/                  # Card data JSON files
│   │   ├── language/          # Language therapy cards (30+ files)
│   │   └── articulation/      # Articulation cards (20+ files)
│   └── package.json           # ESM package config
│
├── frontend/                    # Vanilla TypeScript + Vite
│   ├── public/                 # Static assets
│   │   ├── css/               # Global CSS (loading screen)
│   │   ├── images/            # Card images, icons
│   │   └── sounds/            # Audio effects
│   ├── src/
│   │   ├── features/          # Feature modules
│   │   │   ├── home/         # Home page
│   │   │   ├── boardgame/    # Board game feature
│   │   │   ├── card-browser/ # Card browser feature
│   │   │   └── therapist/    # Therapist dashboard
│   │   ├── common/           # Shared frontend code
│   │   │   ├── components/   # Reusable UI components
│   │   │   └── types/        # Shared TypeScript types
│   │   ├── services/         # API service layer
│   │   └── styles/           # CSS files
│   ├── index.html            # Home page
│   ├── boardgame.html        # Board game page
│   ├── card-browser.html     # Card browser page
│   ├── therapist.html        # Therapist dashboard page
│   └── vite.config.ts
│
├── backend/                     # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── api/               # API layer
│   │   │   ├── middleware/   # Express middleware
│   │   │   └── routes/       # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── evaluation/   # Evaluation PDF extraction
│   │   │   ├── goal/         # IEP goal extraction
│   │   │   ├── auth.service.ts
│   │   │   ├── database.ts
│   │   │   └── student.service.ts
│   │   ├── config/           # Configuration
│   │   └── types/            # TypeScript types
│   └── data/
│       ├── piper.db          # SQLite database
│       └── uploads/          # PDF uploads
│
└── README.md
```

## Technology Stack

### Frontend
- **Language:** TypeScript 5.x
- **Build Tool:** Vite 5.4
- **Architecture:** Feature-Based Architecture
- **Styling:** Vanilla CSS with CSS Variables
- **Module System:** ES Modules
- **Path Aliases:** `@features`, `@common`, `@shared`, `@styles`, `@services`

### Backend
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.21
- **Language:** TypeScript 5.6
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT
- **AI Integration:** OpenAI API
- **Validation:** Zod
- **Dev Runner:** tsx with watch mode

### Shared
- **Categories:** Single source of truth for all card categories and handler mappings
- **Card Data:** JSON files for language and articulation therapy cards
- **Import Alias:** `@shared` available in both frontend and backend

## Development Setup

### Prerequisites
- Node.js 22+
- npm

### Frontend Setup

```bash
cd frontend
npm install
npm run dev        # Start dev server at http://localhost:5173
```

### Backend Setup

```bash
cd backend
npm install        # Also creates @shared symlink via postinstall

# Create .env file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

npm run dev        # Start dev server at http://localhost:3000
```

### Full Stack Development

Run both frontend and backend concurrently:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Available Scripts

### Frontend (`/frontend`)
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run typecheck    # Run TypeScript type checking
```

### Backend (`/backend`)
```bash
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript to JavaScript
npm run start        # Run production build
npm run typecheck    # Run TypeScript type checking
```

## Path Aliases

### Frontend (via Vite)
- `@features/*` → `src/features/*`
- `@common/*` → `src/common/*`
- `@services/*` → `src/services/*`
- `@styles/*` → `src/styles/*`
- `@shared/*` → `../shared/*`

### Backend (via symlink)
- `@shared/*` → `../shared/*` (symlinked to `node_modules/@shared`)

## Environment Variables

### Backend (`.env`)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_PATH` - SQLite database path
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key for PDF extraction
- `CORS_ORIGIN` - Allowed CORS origin

### Frontend (`.env`)
- `VITE_API_URL` - Backend API URL

## Architecture

### Shared Module
- **categories.ts** - Defines all category names, handler types, and category-to-handler mappings
- **cards/** - JSON data files organized by therapy type (language/articulation)
- Used by both frontend (card rendering) and backend (goal extraction prompts)

### Frontend: Feature-Based Architecture
- **Features**: Self-contained modules (`home`, `boardgame`, `therapist`, `card-browser`)
- **Common**: Reusable components and types
- **Services**: API communication layer

### Backend: Layered Architecture
- **API Layer**: Routes and middleware
- **Service Layer**: Business logic
- **Data Layer**: Database access

## Card Categories

The application includes **141+ speech therapy card categories** with 8 handler types:
- `single-answer` - Single text response
- `multiple-answers` - Multiple questions per card
- `multiple-choice` - Choice selection
- `image-selection` - Image-based selection
- `sequencing` - Order/sequence tasks
- `building` - Word/sentence building
- `conditional` - Yes/no conditional responses
- `standard` - Standard card format

## AI Features

- **PDF Evaluation Extraction**: Automatically extract patient information from evaluation PDFs
- **IEP Goal Extraction**: Parse and extract therapy goals from IEP documents
- **Category Matching**: AI matches extracted goals to appropriate card categories

## License

[Add your license here]
