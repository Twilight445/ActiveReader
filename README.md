# 🧠 SocSci Flow (ActiveReader 2.0)

**The AI-Powered Intelligent Textbook Reader for Social Science Students.**

![Status](https://img.shields.io/badge/Status-Active_Development-green) ![Tech](https://img.shields.io/badge/Tech-React_|_Vite_|_Gemini_AI-blue) ![Sync](https://img.shields.io/badge/Sync-Firebase_Cloud-orange)

**SocSci Flow** redefines digital reading. It's not just a PDF viewer; it's an **Active Learning Platform**. By combining a high-performance PDF engine with **Google Gemini 2.5**, it turns static text into an interactive classroom—generating quizzes, timelines, concept maps, and summaries in real-time as you read.

---

## ✨ Key Features

### 📖 The Smart Reader Engine
*   **Hybrid Rendering**: Seamlessly handles both digital (text-layer) PDFs and scanned textbook pages.
*   **Smart Context**: Automatically converts the last 3-5 pages of reading into context for the AI, even extracting text from images via OCR.
*   **Annotation Tools**:
    *   **Highlighter**: Multi-color highlighting that snaps to text or works freely.
    *   **Paint Mode**: Draw diagrams or circle key points directly on the page.
*   **Manual & Auto Modes**: Choose to finish chapters at your own pace or let the AI prompt you at natural checkpoints.

### 🤖 Gemini 2.5 AI Tutor
*   **Auto-Generated Activities**:
    *   **🧠 Micro-Quizzes**: MCQ sets to test understanding of the pages you just read.
    *   **🗺️ Concept Maps**: Visual Mermaid.js flowcharts generated instantly to explain complex topics.
    *   **⏳ Timeline Games**: Interactive drag-and-drop history timelines.
*   **🍌 "Nano Banana" Visualization**: The AI imagines a visual scene to represent abstract concepts and generates a prompt for image creation.
*   **📝 Quick Recap**: Concise 2-3 sentence summaries appear after each activity for rapid review.

### ☁️ Robust Cloud Sync (Firebase)
*   **Cross-Device Harmony**: Start reading on your laptop, continue on your tablet.
*   **Full Data Sync**: Syncs your:
    *   📚 Library & Reading Progress
    *   🖊️ Highlights & Notes
    *   🏆 XP, Level & Streaks
    *   🎨 Generated Image Gallery & Activities
*   **Batch Auto-Save**: Optimized background syncing ensures your data is safe without freezing the UI.

### 📓 The Notebook
A dedicated "Second Brain" for every book:
*   **Summaries Tab**: Review your typed notes.
*   **Highlights Tab**: Browse all your color-coded highlights.
*   **Activities Tab**: Replay any quiz or map you favorited.
*   **Gallery Tab**: View all AI-generated concept images for the book.

---

## 🛠️ Tech Stack & Architecture

*   **Frontend**: React 18, Vite, Tailwind CSS.
*   **State Management**: Zustand (with Persistence & Batched Updates).
*   **AI Engine**: Google Gemini 2.5 Flash (via `google-generative-ai` SDK).
*   **Backend / Sync**: Firebase Firestore & Auth.
*   **PDF Core**: `react-pdf` with custom canvas layers.
*   **Visualizations**: `mermaid` (Graphs), `framer-motion` (Animations).

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js (v18+)
*   npm or yarn

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/socsci-flow.git

# Enter directory
cd socsci-flow

# Install dependencies
npm install
```

### 3. Configuration (.env)

Create a `.env` file in the root directory. You will need API keys for the AI and Firebase services.

```env
# Google Gemini AI (Required)
VITE_GEMINI_API_KEY=your_gemini_key_here

# Firebase Configuration (Required for Sync)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Locally

```bash
npm run dev
```

Open `http://localhost:5173` to start reading!

---

## 📸 Screen Gallery

*(Add screenshots of the Dashboard, Reader View, and Notebook Overlay here)*

---

## 🤝 Contributing

We welcome contributions! Please fork the repo and create a Pull Request.

**Roadmap**:
*   [ ] Local LLM Support (Ollama).
*   [ ] Social Features (Classroom Groups).
*   [ ] Native Mobile Wrapper (Capacitor).

---

**Built with ❤️ for Students.**
