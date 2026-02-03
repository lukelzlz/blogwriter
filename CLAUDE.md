# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hexo Blog Manager is a mobile-first PWA for managing Hexo blogs via GitHub. It consists of:
- **Frontend**: Svelte 4 SPA with Tailwind CSS and Skeleton UI
- **Backend**: Cloudflare Workers API
- **Auth**: GitHub OAuth (access tokens stored in KV)
- **Storage**: GitHub API for blog posts, S3-compatible storage for images

## Development Commands

```bash
# Development (Vite dev server with API proxy)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run type-check
npm run check

# Deploy to Cloudflare Workers/Pages
npm run deploy          # Pages deployment
npm run deploy:worker   # Workers deployment
npm run wrangler:dev    # Local Workers dev (on port 8787)
```

## Architecture

### Project Structure
```
src/
├── app/           # Svelte frontend
│   ├── components/  # Reusable Svelte components
│   ├── routes/      # Page components (custom client-side routing)
│   ├── stores/      # Svelte stores (auth, posts, editor)
│   └── lib/         # Utilities (api, hexo, pwa, s3-presets)
├── worker/        # Cloudflare Workers backend
│   ├── index.ts     # Main entry, request router
│   ├── auth.ts      # GitHub OAuth, session management
│   ├── posts.ts     # Blog post CRUD operations
│   ├── github.ts    # GitHub API wrapper
│   └── upload.ts    # S3 image upload/delete
└── shared/        # Shared TypeScript types
    └── types.ts
```

### Path Aliases (tsconfig.json + vite.config.ts)
- `$app/*` → `./src/app/*`
- `$worker/*` → `./src/worker/*`
- `$shared/*` → `./src/shared/*`
- `$lib/*` → `./src/app/lib/*`
- `$components/*` → `./src/app/components/*`
- `$stores/*` → `./src/app/stores/*`

### Client-Side Routing
The app uses **custom client-side routing** (not svelte-routing). Route handling is in `App.svelte`:
- `handleRoute()` parses `window.location.pathname`
- Pages are conditionally rendered based on `currentPage`
- Routes: `/` (home), `/login`, `/new`, `/settings`, `/edit/[slug]`

### Authentication Flow
1. Frontend calls `POST /auth/github` → gets OAuth URL
2. User authorizes on GitHub
3. GitHub redirects to `/auth/callback?code=xxx&state=xxx`
4. Worker creates session in KV, returns with `session` param in redirect URL
5. Frontend (`App.svelte` onMount) intercepts `?session=xxx`, saves to localStorage
6. Session ID sent via `Authorization: Bearer {sessionId}` header

### API Response Format
All API responses follow this wrapper structure:
```typescript
{ success: boolean; data?: T; error?: string }
```
Frontend auto-unwraps `{ data: ... }` from backend responses.

### Environment Variables

**Worker (wrangler.toml)**:
- `SESSIONS` - KV namespace for session storage
- `GITHUB_CLIENT_ID` - OAuth app client ID
- `GITHUB_REDIRECT_URI` - OAuth callback URL
- `GITHUB_CLIENT_SECRET` - Set via `wrangler secret put`

**Frontend (Vite)**:
- `VITE_API_BASE_URL` - API base URL (defaults to proxy in dev)

### Key Patterns

**GitHub API Authentication**: Uses `token {access_token}` format (NOT `Bearer`), requires `User-Agent` header.

**Front-Matter Parsing**: Uses regex to extract `title` and `date` from YAML front matter. Supports both `\n` and `\r\n` line endings.

**Image Upload**: Uses XMLHttpRequest (not fetch) to support upload progress callbacks. 2-minute timeout for large images.

**Session Expiry**: When API returns 401 with session-related error, frontend automatically triggers re-auth flow via `handleSessionExpired()`.

### Deployment
- Production frontend: `https://writer.qwqc.cc`
- Production API: `https://writer-api.qwqc.cc`
- Deployed via Cloudflare Pages (build output: `dist/`)
