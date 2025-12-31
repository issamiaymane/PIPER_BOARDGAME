# PIPER - Speech Therapy Application

**P**ersonalized **I**EP **P**rogress & **E**valuation **R**eporter

An interactive speech therapy application featuring educational board games, therapist dashboards with AI-powered PDF extraction, and progress tracking for speech therapy professionals.

## 🎯 Features

- **🎮 Interactive Board Game** - Educational speech therapy games with 141+ card categories
- **👨‍⚕️ Therapist Dashboard** - Manage students, track progress, and generate IEP reports
- **🤖 AI-Powered Extraction** - Automatically extract evaluation data and goals from PDFs
- **📊 Progress Tracking** - Monitor student performance and generate reports
- **🎨 Card Browser** - Browse and preview all therapy cards

## 📁 Project Structure

This is a **monorepo** containing both frontend and backend:

```
boardgame-clear-backend/
├── frontend/                   # Vanilla TypeScript + Vite
│   ├── public/                # Static assets
│   │   ├── images/           # Card images, icons
│   │   ├── sounds/           # Audio effects
│   │   └── favicon.svg
│   ├── src/
│   │   ├── features/         # Feature modules
│   │   │   ├── boardgame/   # Board game feature
│   │   │   ├── card-browser/ # Card browser feature
│   │   │   └── therapist/   # Therapist dashboard
│   │   ├── shared/          # Shared code
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── types/       # Shared TypeScript types
│   │   │   └── utils/       # Helper functions
│   │   ├── constants/       # Static data & card definitions
│   │   ├── services/        # API service layer
│   │   └── styles/          # CSS files
│   ├── boardgame.html       # Board game page
│   ├── card-browser.html    # Card browser page
│   ├── therapist.html       # Therapist dashboard page
│   └── vite.config.ts
│
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── api/              # API layer
│   │   │   ├── middleware/  # Express middleware
│   │   │   └── routes/      # API routes
│   │   ├── services/        # Business logic
│   │   │   ├── evaluation/  # Evaluation PDF extraction
│   │   │   ├── goal/        # IEP goal extraction
│   │   │   ├── auth.service.ts
│   │   │   ├── database.ts
│   │   │   └── student.service.ts
│   │   ├── config/          # Configuration
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities
│   └── data/
│       ├── piper.db         # SQLite database
│       └── uploads/         # PDF uploads
│
├── Dockerfile               # Docker configuration
├── .dockerignore
├── render.yaml              # Render.com deployment config
└── README.md
```

## 🚀 Technology Stack

### Frontend
- **Language:** TypeScript 5.9
- **Build Tool:** Vite 5.4
- **Architecture:** Feature-Based Architecture
- **Styling:** Vanilla CSS
- **Module System:** ES Modules

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 4.21
- **Language:** TypeScript 5.6
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT
- **AI Integration:** OpenAI API
- **Validation:** Zod
- **File Upload:** Multer
- **Architecture:** Layered/N-Tier

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Frontend Setup

```bash
cd frontend
npm install
npm run dev        # Start dev server at http://localhost:5173
```

### Backend Setup

```bash
cd backend
npm install

# Create .env file from example
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

## 📝 Available Scripts

### Frontend (`/frontend`)
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production (type-check + build)
npm run preview      # Preview production build
npm run typecheck    # Run TypeScript type checking
npm run clean        # Clean build artifacts
```

### Backend (`/backend`)
```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Run production build
npm run typecheck    # Run TypeScript type checking
npm run clean        # Clean dist folder
```

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t piper-app .

# Run container
docker run -p 3000:3000 -p 5173:5173 piper-app
```

## 🌐 Deployment

This project is configured for deployment on [Render.com](https://render.com) using `render.yaml`.

### Environment Variables

**Backend** (`.env`):
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_PATH` - SQLite database path
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key for PDF extraction
- `CORS_ORIGIN` - Allowed CORS origin

**Frontend** (`.env`):
- `VITE_API_URL` - Backend API URL

## 📚 Architecture

### Frontend: Feature-Based Architecture
- **Features**: Self-contained modules (`boardgame`, `therapist`, `card-browser`)
- **Shared**: Reusable components, hooks, utilities, and types
- **Services**: API communication layer
- **Constants**: Static data and configurations

### Backend: Layered Architecture
- **API Layer**: Routes and middleware
- **Service Layer**: Business logic
- **Data Layer**: Database access
- **Clear separation** between layers

## 🎮 Card Categories

The application includes **141+ speech therapy card categories** covering:
- Language skills (vocabulary, grammar, comprehension)
- Articulation practice
- Sequencing and reasoning
- Story comprehension
- And more!

## 🤖 AI Features

- **PDF Evaluation Extraction**: Automatically extract patient information from evaluation PDFs
- **IEP Goal Extraction**: Parse and extract therapy goals from IEP documents
- **Intelligent Field Detection**: AI identifies missing or uncertain information

## 📄 License

[Add your license here]

## 👥 Contributors

[Add contributors here]

## 🐛 Issues & Support

For bugs and feature requests, please create an issue in the repository.
