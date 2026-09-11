# ForgeMind AI

**Domain:** Industry 5.0  
**Problem:** Adaptive Production Planning & Disruption Management  
**Team:** NexForge  

---

## Overview

ForgeMind AI is an Industry 5.0 solution designed for adaptive production planning and real-time disruption management in manufacturing and industrial environments.

## Project Structure

```text
ForgeMind-AI/
├── backend/          # Minimal FastAPI backend
│   ├── main.py
│   └── requirements.txt
├── frontend/         # React + Vite frontend
├── data/             # Production datasets & logs
├── docs/             # Architecture and project documentation
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Unix/macOS:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
