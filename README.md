# 🎓 EduSpark AI

**AI-Powered Video Learning Platform** — Transform any video into an interactive, personalized learning experience.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js) ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Smart Dashboard** | Personalized learning roadmaps, XP tracking, streaks, and course discovery |
| 📺 **AI Classroom Player** | Watch any YouTube video with AI-generated chapters, quizzes, and study tools |
| 🤖 **Raise Hand (AI Tutor)** | Pause anytime and ask an AI expert questions about the content |
| 🎙️ **Podcast Studio** | Transform video lectures into podcast-style audio summaries |
| 🧠 **Smart Board** | Interactive concept diagrams, flashcards, and visual learning tools |
| 👥 **Collaboration Hub** | Study rooms, discussion forums, and real-time sync tools |
| 🏆 **Gamification** | XP points, levels, badges, streaks, and global leaderboard |
| 🗺️ **AI Roadmap Generator** | Auto-generate structured learning paths for any topic |
| 📄 **PDF Ingestion** | Upload study materials and get AI-powered analysis |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/PUNEETH-BV/Edu-spark-.git
cd Edu-spark-

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Demo Credentials
- **Email:** `elena@eduspark.ai`
- **Password:** `password`

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (Pages Router)
- **UI:** React 18, Tailwind CSS, Material Symbols
- **Auth:** Supabase Auth (Google OAuth + Email/Password)
- **AI:** Gemini API for content analysis, quiz generation, and tutoring
- **Fonts:** Inter, Outfit (Google Fonts)
- **Deployment:** Vercel

## 📁 Project Structure

```
├── components/          # Reusable UI components
│   ├── Sidebar.js       # Navigation sidebar
│   └── player/          # Video player sub-components
├── contexts/            # React context providers
│   └── AuthContext.js   # Authentication state management
├── lib/                 # Utilities and API clients
│   ├── supabase.js      # Supabase client configuration
│   └── videoUtils.js    # Video platform detection & helpers
├── pages/               # Next.js pages
│   ├── dashboard.js     # Main learning dashboard
│   ├── player/[id].js   # AI-powered video player
│   ├── podcasts.js      # Podcast studio
│   ├── smart-board.js   # Visual learning tools
│   ├── community.js     # Collaboration hub
│   ├── profile.js       # User profile & settings
│   ├── login.js         # Sign in page
│   └── signup.js        # Sign up page
└── styles/              # Global CSS
```

## 🎨 Screenshots

> See the live demo below!

## 🌐 Live Demo

Deployed on Vercel: [View Live →](https://edu-spark.vercel.app)

## 📝 License

This project is licensed under the MIT License.

---

Built with ❤️ by [Puneeth BV](https://github.com/PUNEETH-BV)
