# Speech Therapy AI

An interactive speech therapy application featuring AI-powered feedback, educational board games, and conversational practice modes for children and speech therapy professionals.

## Project Structure

```
speech_therapy_ai/
├── backend/                    # Node.js/TypeScript API Server
│   ├── src/
│   │   ├── api/               # REST API Layer
│   │   │   ├── controllers/   # Request handlers
│   │   │   ├── middleware/    # Express middleware
│   │   │   │   ├── cors.ts    # CORS configuration
│   │   │   │   └── errorHandler.ts
│   │   │   └── routes/        # API route definitions
│   │   ├── config/            # Centralized configuration
│   │   │   └── index.ts       # Environment & app settings
│   │   ├── services/          # Business Logic
│   │   │   ├── analysis/      # Speech pattern analysis
│   │   │   ├── conversation/  # AI conversation agent
│   │   │   ├── processors/    # Card type processors
│   │   │   ├── speech/        # Text-to-speech service
│   │   │   └── transcription/ # Whisper transcription
│   │   └── types/             # TypeScript type definitions
│   ├── tests/                 # Test suites
│   └── dist/                  # Compiled JavaScript output
│
├── frontend/                   # Static Web Frontend
│   ├── assets/                # Static Assets
│   │   ├── images/
│   │   │   └── cards/         # Card images (141 categories)
│   │   ├── sounds/            # Audio effects (start, correct, wrong, bonus, win)
│   │   └── favicon.svg
│   ├── css/                   # Stylesheets
│   │   └── boardgame.css      # Main stylesheet (~11,500 lines, categorized)
│   ├── pages/                 # HTML Pages
│   │   ├── boardgame.html     # Board game interface
│   │   ├── conversation.html  # Conversation mode
│   │   └── assignment.html    # Assignment mode
│   ├── scripts/               # JavaScript Modules
│   │   ├── core/              # Core Modules
│   │   │   ├── audio-manager.js
│   │   │   ├── dom-cache.js
│   │   │   ├── state-manager.js
│   │   │   └── ui-manager.js
│   │   ├── data/              # Game Data
│   │   │   └── boardgame-data.js  # 141 card categories
│   │   ├── handlers/          # Card Type Handlers (45+ handlers)
│   │   │   ├── base-handler.js
│   │   │   ├── vocabulary-handler.js
│   │   │   ├── grammar-handler.js
│   │   │   └── ... (specialized handlers)
│   │   └── pages/             # Page Controllers
│   │       ├── boardgame.js
│   │       ├── conversation.js
│   │       └── assignment.js
│   └── index.html             # Landing page
│
├── data/                       # Research & Training Data
│   ├── spectrograms/          # Audio analysis spectrograms
│   └── voices/                # Voice sample recordings
│
└── docs/                       # Documentation
    ├── ARCHITECTURE.md        # System architecture details
    ├── FLOW.md                # User interaction flows
    └── SETUP.md               # Detailed setup instructions
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Create .env file in backend/
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key  # Optional
   PORT=3000
   NODE_ENV=development
   ```

3. **Start the server:**
   ```bash
   npm run dev    # Development with hot reload
   npm start      # Production
   ```

4. **Access the application:**
   - Open `http://localhost:3000` in your browser
   - Landing page redirects to conversation mode by default

## Features

### Board Game Mode
- **141 Card Categories** covering vocabulary, grammar, language concepts, and comprehension
- **Interactive gameplay** with dice rolling, player turns, and scoring
- **Real-time speech recognition** with AI-powered feedback
- **Visual and audio feedback** for correct/incorrect answers

### Conversation Mode
- **AI-powered dialogue** for natural speech practice
- **Context-aware responses** tailored to speech therapy goals
- **Voice input/output** for hands-free interaction

### Assignment Mode
- **Structured exercises** for targeted speech therapy
- **Progress tracking** and performance metrics
- **Customizable difficulty** levels

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/transcribe` | POST | Audio transcription (Whisper) |
| `/api/tts` | POST | Text-to-speech synthesis |
| `/api/analyze` | POST | Phonetic analysis |
| `/api/session/*` | * | Session management |
| `/api/conversation/*` | * | Conversation agent |

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **AI Services**: OpenAI (Whisper, GPT, TTS), Anthropic Claude

### Frontend
- **Framework**: Vanilla JavaScript (ES6+)
- **Styling**: Custom CSS with categorized sections
- **Audio**: Web Audio API

### Architecture Patterns
- **Modular handlers** for each card type
- **Factory pattern** for processor creation
- **Centralized state management**
- **Event-driven audio system

## Card Categories (141 Total)

| Category Type | Examples |
|--------------|----------|
| **Vocabulary** | Animals, Food, Colors, Body Parts, Household Items |
| **Grammar** | Verbs, Pronouns, Prepositions, Conjunctions |
| **Language Concepts** | Synonyms, Antonyms, Analogies, Idioms |
| **Comprehension** | Context Clues, Inferencing, Wh-Questions |
| **Phonics** | Rhyming, Beginning Sounds, Blends |
| **Social Skills** | Emotions, Manners, Safety Signs |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design, patterns, and data flow
- [Flow](docs/FLOW.md) - User interaction and game flow diagrams
- [Setup](docs/SETUP.md) - Detailed environment setup guide

## Development

### Running Tests
```bash
cd backend
npm test
```

### Building for Production
```bash
cd backend
npm run build
```

### Code Structure Guidelines
- **Handlers**: One handler per card type in `frontend/scripts/handlers/`
- **Data**: Card definitions in `frontend/scripts/data/boardgame-data.js`
- **Styles**: CSS organized by category numbers [1-65] in `frontend/css/boardgame.css`

## License

Private - All rights reserved.
