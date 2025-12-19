# Flowspace Backend Engineering Guide 🛠️

This document details the technical architecture, API surface, and design decisions behind the Flowspace backend.

## 🏗️ Architecture

The backend is built on **Node.js** and **Express**, utilizing **Socket.IO** for real-time bidirectional communication.

### Core Components
1.  **BoardService (`src/services/boardService.js`)**:
    *   **In-Memory State**: Uses JavaScript `Map`s to store active board states for O(1) access times during high-frequency drawing events.
    *   **Undo/Redo Stacks**: Maintains operation history per room using deep-copy snapshots (optimized with shallow array copies).
    *   **Persistence Strategy**: Implements a write-behind pattern. State is held in memory and asynchronously flushed to disk (`snapshots/`) via `AutosaveService`.

2.  **AutosaveService (`src/board/autosave.js`)**:
    *   **Atomic Writes**: Prevents data corruption by writing to `filename.json.tmp` and renaming to `filename.json`.
    *   **Crash Recovery**: On startup, fully hydrates the `BoardService` from the `snapshots/` directory.

3.  **AI Pipeline (`src/ai/`)**:
    *   Decoupled service layer for AI operations.
    *   Controllers handle validation and HTTP responses.
    *   Services interact with OpenAI SDK, managing prompt engineering and heuristics.

## 🔌 API Routes

All routes are prefixed with `/api`.

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health check | - |
| `POST` | `/api/ai/summarize` | Summarize board text | `{ text: string }` |
| `POST` | `/api/ai/rewrite` | Tone-aware rewriting | `{ text: string, tone: 'professional'\|'casual'... }` |
| `POST` | `/api/ai/sticky-note`| OCR & Format Sticky Note | `{ image: string (base64) }` |

## 📡 WebSocket Events (Socket.IO)

### Client -> Server
*   `join-room(roomId)`: Request to enter a board session.
*   `draw-stroke(payload)`: `{ roomId, stroke }` - Sent when a user finishes a stroke.
*   `cursor-move(payload)`: `{ roomId, x, y }` - Ephemeral cursor tracking.
*   `undo({ roomId })`: Request state rollback.
*   `redo({ roomId })`: Request state re-application.
*   `sync-request({ roomId })`: Explicit pull for latest state.

### Server -> Client
*   `board-init({ strokes })`: Sent to user upon joining.
*   `user-joined({ userId })`: Notification to room.
*   `draw-stroke(stroke)`: Broadcasted primitive to other clients.
*   `cursor-move({ userId, x, y })`: Broadcasted ephemeral update.
*   `sync-board({ strokes })`: Full state replacement (used after undo/redo/recovery).

## 🧠 AI Pipeline Details

1.  **Summarization**:
    *   **Input**: Raw text or Board JSON.
    *   **Heuristics**: `summarize.js` first parses Board JSON to extract text nodes and cluster shapes before sending a structured prompt to `gpt-4o-mini`.
2.  **Sticky Note (OCR)**:
    *   **Input**: Base64 Image.
    *   **Vision**: Uses `gpt-4o-mini` with Vision capabilities to transcribe handwriting and format it into a clean notes. Falls back gracefully if API is missing.

## 📈 Scaling Strategy

The current implementation is optimized for specific performance characteristics:

1.  **Vertical Scaling**: Node.js event loop handles thousands of concurrent WebSocket connections efficiently.
2.  **Horizontal Scaling (Future)**:
    *   **Stateless logic**: The API routes are stateless and can be load-balanced easily.
    *   **Stateful logic (Boards)**: Currently in-memory. To scale horizontally:
        1.  Start a **Redis Adapter** for Socket.IO to distribute events.
        2.  Migrate `BoardService` storage from Memory -> **Redis**.
        3.  Implement **Sticky Sessions** at the load balancer level (required for Socket.IO).

## 🛡️ Error Handling

*   **Global Middleware**: `src/middleware/errorHandler.js` captures all async errors.
*   **Operational vs Programmer Errors**: Custom `AppError` class distinguishes between expected client errors (400s) and system crashes (500s).
*   **Graceful Shutdown**: Handles `unhandledRejection` to log before exit.


<!-- Deployment: Triggering rebuild for Railway with express-rate-limit dependency -->
