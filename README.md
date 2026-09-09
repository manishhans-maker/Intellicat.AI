# IntelicatAI 🐾⚡

Cybernetic Cat Coder & AI Software Engineering Assistant powered by **Groq LPU (Llama 3.3 70B)** and **Google Gemini 3.6 Flash**.

---

## 🚀 Quick Deploy to Vercel

This repository is pre-configured to work directly on **Vercel** with full Server-Sent Events (SSE) streaming support for both Groq and Gemini AI engines.

### Step 1: Push or Export to GitHub
- In Google AI Studio: Click the **Settings / Menu** in the top right and select **Export to GitHub** (or **Download ZIP** and push to a new GitHub repository).
- Or push this repo directly to your GitHub account:
  ```bash
  git init
  git add .
  git commit -m "Initial commit of IntelicatAI"
  git branch -M main
  git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
  git push -u origin main
  ```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. Framework Preset will be automatically detected as **Vite**.
5. Build Command: `npm run build`
6. Output Directory: `dist`

### Step 3: Add Environment Variables
Under **Environment Variables** in Vercel, add either or both:
- **`GROQ_API_KEY`**: Your Groq API key for blazing-fast inference (~300 tokens/sec). Get a free key at [console.groq.com](https://console.groq.com).
- **`GEMINI_API_KEY`**: Your Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).

Click **Deploy**! Your site and streaming endpoint (`/api/chat`) will be live in ~1 minute.

---

## 💻 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   cd <YOUR_REPO_NAME>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your keys:
   ```env
   GROQ_API_KEY="gsk_..."
   GEMINI_API_KEY="..."
   ```

4. **Start the local server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **AI Engines**: 
  - ⚡ **Groq LPU**: `llama-3.3-70b-versatile` via `groq-sdk` (ultra-fast ~300 tokens/sec)
  - ✨ **Google Gemini**: `gemini-3.6-flash` via `@google/genai`
- **Backend**: Node.js, Express, Vercel Serverless Functions (`/api/chat.ts`)
- **Streaming**: Real-time Server-Sent Events (SSE) streaming
