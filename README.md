# IntelicatAI 🐾⚡

Cybernetic Cat Coder & AI Software Engineering Assistant powered by Gemini 3.6 Flash.

---

## 🚀 Quick Deploy to Vercel

This repository is pre-configured to work directly on **Vercel** with full Server-Sent Events (SSE) streaming support for the Gemini AI assistant.

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

### Step 3: Add Environment Variable
Under **Environment Variables** in Vercel:
- **Key**: `GEMINI_API_KEY`
- **Value**: Your Google Gemini API Key (obtain one for free from [Google AI Studio](https://aistudio.google.com/app/apikey))

Click **Deploy**! Your site and AI streaming endpoint (`/api/chat`) will be live in ~1 minute.

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
   Add your `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   ```

4. **Start the local server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Backend / AI Engine**: Node.js, Express, Vercel Serverless Functions (`/api/chat.ts`), `@google/genai` (Gemini 3.6 Flash)
- **Streaming**: Server-Sent Events (SSE) real-time token streaming
