# Peri.ai

**AI-powered platform connecting influencers with businesses through intelligent inquiry management and automated responses.**

Peri.ai streamlines the collaboration process between influencers and brands by using AI agents to handle initial inquiries, negotiate terms, and provide personalized recommendations—allowing influencers to focus on content creation while maintaining control over final decisions.

---

## 🌟 Features

### For Influencers
- **Custom AI Agent**: Configure your AI agent with personal preferences, pricing baselines, and content guidelines
- **Automated Inquiry Handling**: AI agent engages with businesses, asks clarifying questions, and negotiates terms
- **Smart Recommendations**: Receive AI-generated recommendations (approve/reject/needs info) based on your preferences
- **Public Profile Page**: Shareable link (`/i/username`) where businesses can submit collaboration requests
- **Dashboard**: Review all inquiries, view chat histories, and make final decisions
- **Email Notifications**: Automatic status updates sent to businesses when you approve/reject proposals

### For Businesses
- **Simple Inquiry Form**: Submit collaboration proposals with details about budget, timeline, and campaign goals
- **AI Chat Interface**: Interactive conversation with the influencer's AI agent to refine proposals
- **Real-time Responses**: Get immediate feedback and questions from the AI agent
- **Automatic Chat Closure**: Conversations close when navigating away, triggering AI analysis

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Wouter for routing
- TanStack Query for data fetching
- Tailwind CSS + shadcn/ui components

**Backend:**
- Vercel Serverless Functions (Node.js)
- PostgreSQL (Neon) for data persistence
- Drizzle ORM for database operations
- Passport.js for Google OAuth authentication
- Express Session with PostgreSQL session store

**AI & External Services:**
- OpenAI API (GPT-4) for AI agent conversations and recommendations
- Resend for transactional email delivery

**Deployment:**
- Vercel for hosting (frontend + serverless functions)
- Neon for managed PostgreSQL database

---

## 📁 Project Structure

```
Peri.ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components (shadcn/ui)
│   │   ├── pages/         # Route-level page components
│   │   ├── hooks/         # Custom React hooks (useAuth, etc.)
│   │   └── lib/           # Utilities (queryClient, API helpers)
│   └── index.html
│
├── api/                   # Vercel serverless functions
│   ├── _lib/             # Shared utilities
│   │   ├── middleware.ts  # Auth, session management
│   │   ├── storage.ts     # Database operations
│   │   ├── aiAgent.ts     # OpenAI integration
│   │   ├── email.ts       # Resend email service
│   │   └── db.ts          # Drizzle database connection
│   │
│   ├── auth/             # Authentication endpoints
│   │   ├── google/       # Google OAuth flow
│   │   ├── user.ts       # Get current user
│   │   ├── username.ts   # Update username
│   │   └── logout.ts     # Session logout
│   │
│   ├── users/
│   │   └── [username].ts # Public user profile lookup
│   │
│   ├── inquiries/        # Business inquiry management
│   │   ├── index.ts      # Create/list inquiries
│   │   └── [id]/
│   │       ├── messages/ # Chat messages
│   │       ├── status.ts # Update inquiry status
│   │       └── close.ts  # Close chat and generate recommendation
│   │
│   └── preferences/
│       └── index.ts      # Influencer preferences management
│
├── shared/
│   └── schema.ts         # Database schema (Drizzle)
│
├── drizzle/              # Database migrations
├── vercel.json           # Vercel configuration
├── drizzle.config.ts     # Drizzle ORM config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Neon)
- Google OAuth credentials
- OpenAI API key
- Resend API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Peri.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create `.env.local` in the root directory:

   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

   # Session Secret (generate with: openssl rand -base64 64)
   SESSION_SECRET=your-random-session-secret

   # OpenAI
   OPENAI_API_KEY=sk-proj-...

   # Resend Email
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=onboarding@resend.dev

   # Node Environment
   NODE_ENV=development
   ```

4. **Set up the database**

   ```bash
   # Push schema to database
   npm run db:push
   ```

5. **Start the development server**

   ```bash
   # Using Vercel CLI (recommended)
   vercel dev

   # Or using the build:
   npm run build
   npm run dev
   ```

6. **Visit the app**
   ```
   http://localhost:5000
   ```

---

## 🔑 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Get from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Get from Google Cloud Console |
| `SESSION_SECRET` | Secret for session encryption | Random 64-char string |
| `OPENAI_API_KEY` | OpenAI API key for AI agent | `sk-proj-...` |
| `RESEND_API_KEY` | Resend API key for emails | `re_...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RESEND_FROM_EMAIL` | From address for emails | `onboarding@resend.dev` |
| `NODE_ENV` | Environment mode | `development` |
| `GOOGLE_CALLBACK_URL` | OAuth callback (local dev) | Auto-detected in production |

---

## 📊 Database Schema

### Core Tables

**users**
- User accounts (influencers)
- OAuth profile information (Google)
- Username for public profile URLs

**influencer_preferences**
- AI agent configuration
- Content preferences and guidelines
- Pricing baselines
- Custom instructions for AI

**inquiries**
- Business collaboration requests
- Status tracking (pending/approved/rejected/needs_info)
- Chat state (active/closed)
- AI-generated recommendations

**messages**
- Chat conversation history
- User and AI agent messages
- Linked to inquiries

**sessions**
- Express session storage
- Managed by connect-pg-simple

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth login |
| GET | `/api/auth/google/callback` | OAuth callback handler |
| GET | `/api/auth/user` | Get current authenticated user |
| PATCH | `/api/auth/username` | Update username |
| POST | `/api/auth/logout` | Log out and destroy session |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:username` | Get public user profile by username |

### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/preferences` | Get influencer preferences |
| POST | `/api/preferences` | Create/update preferences |

### Inquiries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inquiries` | List all inquiries (auth required) |
| POST | `/api/inquiries` | Create new inquiry |
| GET | `/api/inquiries/:id` | Get single inquiry |
| PATCH | `/api/inquiries/:id/status` | Update inquiry status (approve/reject) |
| POST | `/api/inquiries/:id/close` | Close chat, generate AI recommendation |
| DELETE | `/api/inquiries/:id` | Delete inquiry |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inquiries/:id/messages` | Get chat messages for inquiry |
| POST | `/api/inquiries/:id/messages` | Send message (triggers AI response) |

---

## 🎯 User Flow

### Influencer Setup
1. Sign in with Google OAuth
2. Set unique username
3. Configure AI agent preferences:
   - Content types you create
   - Pricing baseline
   - Content length preferences
   - Additional guidelines
4. Share public URL (`/i/username`) with potential collaborators

### Business Inquiry
1. Visit influencer's public page (`/i/username`)
2. Fill out inquiry form:
   - Business email
   - Collaboration proposal
   - Budget offer (optional)
   - Company information (optional)
3. Submit form → Redirected to AI chat
4. Chat with AI agent to refine proposal
5. Navigate away → Chat auto-closes, AI generates recommendation

### Influencer Review
1. View incoming inquiries in dashboard
2. See AI recommendation (approve/reject/needs info)
3. Review chat history
4. Make final decision:
   - **Approve**: Business gets approval email
   - **Reject**: Business gets rejection email with optional feedback
   - **Needs Info**: Business gets email asking for more details
5. Delete inquiries when completed

---

## 📧 Email Notifications

Emails are automatically sent via Resend when influencers update inquiry status:

**Approved:** "Great news! Your collaboration proposal has been approved"
**Rejected:** "Update on your collaboration proposal" (with optional feedback)
**Needs Info:** "More information needed for your collaboration proposal"

### Email Limitations

With Resend's free tier using `onboarding@resend.dev`:
- ✅ Can send to verified email addresses only
- ❌ Cannot send to arbitrary business emails

**Production setup requires:**
- Own a domain (e.g., `peri.ai`)
- Verify domain in Resend dashboard
- Update `RESEND_FROM_EMAIL` to `noreply@yourdomain.com`

---

## 🤖 AI Agent

The AI agent is powered by OpenAI's GPT-4 and:

1. **Handles Initial Inquiries**
   - Reads business proposal
   - Uses influencer's preferences
   - Generates relevant questions

2. **Interactive Chat**
   - Responds to business messages in real-time
   - Negotiates terms based on preferences
   - Asks clarifying questions

3. **Generates Recommendations**
   - Analyzes entire conversation
   - Evaluates against preferences
   - Outputs structured recommendation:
     - `APPROVE` - Good fit, meets criteria
     - `REJECT` - Doesn't align with preferences
     - `NEEDS INFO` - More information required

AI prompt templates are in `api/_lib/aiAgent.ts`.

---

## 🚢 Deployment

### Vercel Deployment

1. **Push code to GitHub**

2. **Import project in Vercel**
   - Visit https://vercel.com/new
   - Import from GitHub
   - Configure:
     - Framework: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist/public`

3. **Add environment variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Update `GOOGLE_CALLBACK_URL` to production URL

4. **Deploy**
   - Vercel auto-deploys on every push to `main`
   - Or manually: `vercel --prod`

### Database Setup (Neon)

1. Create database at https://neon.tech
2. Copy connection string
3. Add to Vercel environment variables as `DATABASE_URL`
4. Run migrations:
   ```bash
   npm run db:push
   ```

---

## 🧪 Development

### Running Locally

```bash
# Start development server
vercel dev

# Alternative: Build and serve
npm run build
npm run dev
```

### Database Commands

```bash
# Push schema changes to database
npm run db:push

# Generate migrations (if needed)
drizzle-kit generate

# View database in Drizzle Studio
drizzle-kit studio
```

### Type Checking

```bash
npm run check
```

---

## 🔒 Security Features

- **Session-based authentication** with PostgreSQL storage
- **httpOnly cookies** to prevent XSS attacks
- **CSRF protection** via sameSite cookie policy
- **Environment variable protection** (secrets never in code)
- **OAuth 2.0** with Google for secure login
- **Authenticated endpoints** protected by middleware
- **Input validation** with Zod schemas

---

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/), [React](https://react.dev/), and [TypeScript](https://www.typescriptlang.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Deployed on [Vercel](https://vercel.com/)
- Database hosted on [Neon](https://neon.tech/)
- AI powered by [OpenAI](https://openai.com/)
- Emails via [Resend](https://resend.com/)
