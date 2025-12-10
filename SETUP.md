# Flowspace - Setup Guide

## Project Structure

```
Flowspace/
├── frontend/
│   └── src/
│       ├── components/
│       │   └── Whiteboard.jsx
│       ├── state/
│       │   └── boardStore.js
│       └── socket/
│           └── useSocket.js
├── backend/
│   └── src/
│       ├── server.js
│       ├── routes/
│       │   └── aiRoutes.js
│       ├── ai/
│       │   └── aiController.js
│       ├── socket/
│       └── board/
├── snapshots/
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 14+
- npm or yarn
- Git

### Backend Setup
```bash
cd backend
npm install
cp ../.env.example ../.env
# Edit .env with your settings
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Environment Variables
Copy `.env.example` to `.env` and configure:
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `BACKEND_PORT` - Backend server port (default: 5000)
- `REACT_APP_BACKEND_URL` - Frontend backend URL

## Features
- Real-time collaborative whiteboard with WebSockets
- AI-powered text summarization
- Dynamic content rewriting
- Smart sticky note generation
- Auto-save functionality

## Next Steps
1. Install dependencies for frontend and backend
2. Set up environment variables
3. Integrate with OpenAI or preferred AI service
4. Implement database for persistence
5. Add authentication/authorization
