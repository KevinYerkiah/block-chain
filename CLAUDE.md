# CLAUDE.md — Confession Platform

## Project Overview
A confession-based anonymous social platform built with **React (Vite)** and **Supabase**. Users post confessions to a global feed, upvote/downvote, comment, and verify content integrity against a blockchain. The UI is inspired by Twitter's layout (left sidebar nav, center feed, compose box) but with a distinct orange brand identity.

Blockchain integration is handled by a separate team — this codebase covers the **frontend + Supabase backend** only. Where blockchain calls are needed, leave stub functions with `// TODO: Blockchain team` comments.

## Tech Stack
- **Frontend:** React 18 + Vite, React Router v6, plain CSS modules (no Tailwind, no UI library)
- **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions)
- **Auth:** Supabase email/password auth with PKCE flow
- **State:** React Context for auth state, local state for everything else
- **Encryption:** Web Crypto API for SHA-256 hashing (DH encryption is a TODO stub)
- **Sanitization:** DOMPurify

## Supabase Config
- **Project URL:** `https://lwpgevacshnlmyexyuhm.supabase.co`
- **Anon Key:** `sb_publishable_hutvqchdXl2isJ-oI7i8iA_iUyO3KyZ`
- Store these in `src/config/supabase.js`. Use memory-based token storage (NOT localStorage) for XSS protection. Use PKCE auth flow.

## Color System
All colors are in `src/config/colors.js`. The palette is a professional warm orange theme. Import from there — never hardcode hex values in components.

## Database Schema
The full schema is in `docs/SCHEMA.sql`. **Do NOT run this — it's already live in Supabase.** It's here for reference so you know the table shapes.

Key tables: `users`, `confessions`, `comments`, `votes`, `blockchain_sync_log`, `temporal_records`, `confession_edits`.

## Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Email/password login + link to register |
| `/register` | `RegisterPage` | Signup form: email, username, display_name, password |
| `/` | `HomePage` | Global feed — compose box + reverse-chronological confession list |
| `/profile/:username` | `ProfilePage` | User profile with cover, avatar, bio, their confessions. "Temporal" toggle button to show deleted/edited history |
| `/temporal` | `TemporalPage` | Search bar to look up usernames (including burned accounts) |
| `/settings` | via `More` menu | Not a full page — just a dropdown in the sidebar with "Sign Out" and "BURN" |

All routes except `/login` and `/register` require authentication. Use a `<ProtectedRoute>` wrapper that redirects to `/login` if no session.

## Layout Structure
```
┌──────────────────────────────────────────────────┐
│  ┌─────────┐  ┌──────────────────────┐           │
│  │ Sidebar  │  │   Main Content       │           │
│  │          │  │                      │           │
│  │ Logo     │  │  (page content)      │           │
│  │ Global   │  │                      │           │
│  │ Temporal │  │                      │           │
│  │ Profile  │  │                      │           │
│  │ More     │  │                      │           │
│  │          │  │                      │           │
│  │          │  │                      │           │
│  │ ──────── │  │                      │           │
│  │ User pill│  │                      │           │
│  └─────────┘  └──────────────────────┘           │
└──────────────────────────────────────────────────┘
```

- **Sidebar:** Fixed left, ~260px wide. Logo at top, nav links (Global, Temporal, Profile, More), logged-in user pill at bottom with avatar + name + @username.
- **Main content:** Centered column, max-width ~600px, with a top header bar showing the page title.
- No right sidebar.

## Component Architecture

### CRITICAL: Modular & Reusable Design
Every UI element that appears more than once MUST be a reusable component with props. **Do not duplicate markup.** Build from the bottom up: primitives first, then compose them into feature components, then assemble pages from feature components.

### Primitive Components (`src/components/ui/`)
These are the base building blocks. Every one accepts props for customization. Each gets its own file + CSS Module.

- **`Button.jsx`** — All buttons in the app use this. Props: `variant` (`'primary'` | `'outline'` | `'danger'` | `'ghost'`), `size` (`'sm'` | `'md'` | `'lg'`), `fullWidth` (bool), `disabled`, `loading` (shows spinner), `onClick`, `children`. Primary = solid `primary` bg. Outline = 1px `border`, transparent bg. Danger = solid `danger` bg. Ghost = no border, no bg, hover shows `hoverBg`.
- **`Input.jsx`** — All text inputs use this. Props: `label`, `placeholder`, `type` (`'text'` | `'password'` | `'email'`), `value`, `onChange`, `error` (string, shown in red below input), `hint` (string, shown in muted below input), `icon` (optional leading SVG element), `maxLength`. Handles focus ring with `inputFocus` color.
- **`Textarea.jsx`** — The compose box textarea. Props: `placeholder`, `value`, `onChange`, `maxLength`, `rows`, `autoGrow` (bool). Same focus styling as Input.
- **`Avatar.jsx`** — All avatars use this. Props: `size` (`'sm'` 32px | `'md'` 48px | `'lg'` 120px), `src` (defaults to `/default-avatar.png`). Always circular.
- **`Badge.jsx`** — Small pills/labels. Props: `variant` (`'default'` | `'danger'` | `'success'` | `'warning'`), `children`. Used for "Burned" badge on temporal results, edit window status, etc.
- **`Modal.jsx`** — Overlay + centered card. Props: `isOpen`, `onClose`, `title`, `children`. Handles backdrop click-to-close, escape key. Used by BurnModal and potentially comment modals.
- **`IconButton.jsx`** — Clickable icon with hover state. Props: `icon` (SVG element), `label` (screen reader text), `count` (optional number shown beside icon), `active` (bool), `activeColor`, `onClick`. Used in the action bar for comment/upvote/downvote/verify.
- **`Dropdown.jsx`** — Positioned popup menu. Props: `isOpen`, `onClose`, `items` (array of `{ label, icon, onClick, variant }`), `position` (`'above'` | `'below'`). Used by the More menu.
- **`SearchInput.jsx`** — Input with a magnifying glass icon and debounced `onSearch` callback. Props: `placeholder`, `onSearch`, `debounceMs` (default 300).
- **`Loader.jsx`** — Simple spinner for loading states. Props: `size` (`'sm'` | `'md'`).
- **`PageHeader.jsx`** — Sticky top bar with title. Props: `title`, `backButton` (bool, shows ← arrow that calls navigate(-1)).

### Feature Components (`src/components/`)
Composed from primitives. These handle business logic and data.

- **`Sidebar.jsx`** — uses `Avatar`, `IconButton`, `Dropdown`. Nav links use React Router's `NavLink` for active state.
- **`ConfessionCard.jsx`** — uses `Avatar`, `IconButton` (for the action bar), `Badge` (for edit window status). Props: `confession` (object), `currentUserId`, `onComment` callback.
- **`ComposeBox.jsx`** — uses `Avatar`, `Textarea`, `Button`. Handles the sanitize → rate limit → hash → post pipeline internally.
- **`ActionBar.jsx`** — uses `IconButton` for each action. Props: `confessionId`, `currentUserId`, `isOnChain`, `contentHash`, `blockchainTxHash`, `decryptedContent`. Manages vote state and verify state internally.
- **`ConfessionFeed.jsx`** — maps an array of confessions into `ConfessionCard` components. Props: `confessions` (array), `currentUserId`, `loading` (bool), `onLoadMore` callback. Shows `Loader` when loading.
- **`ProtectedRoute.jsx`** — auth guard wrapper, redirects to `/login` if no session.
- **`BurnModal.jsx`** — uses `Modal`, `Input`, `Button`. The DELETE confirmation flow.
- **`ProfileHeader.jsx`** — uses `Avatar`, `Button`, `Badge`. The cover + avatar + name + bio + temporal toggle section of the profile page.
- **`TemporalConfessionCard.jsx`** — extends `ConfessionCard` with the red-tinted deleted/edited display. Uses `Badge` for "Deleted" / "Original version" labels.
- **`UserResultCard.jsx`** — used in Temporal search results. Uses `Avatar`, `Badge`. Clickable row that navigates to profile.

### Auth Flow
1. **Register:** collect email, username, display_name, password → `supabase.auth.signUp()` → insert into `users` table with generated UUID matching `auth.uid()` → redirect to `/`
2. **Login:** email + password → `supabase.auth.signInWithPassword()` → redirect to `/`
3. **Logout:** `supabase.auth.signOut()` → clear memory storage → redirect to `/login`
4. **Session:** stored in memory only (not localStorage). Page refresh = re-login. This is intentional for security.

### Posting a Confession (security pipeline)
```
User types text
    ↓
sanitizeText(text)              — strip HTML/XSS via DOMPurify
    ↓
validateConfession(sanitized)   — length checks, empty check
    ↓
canUserPost(userId)             — client + server rate limit (max 10/hr)
    ↓
hashContent(sanitized)          — SHA-256 via Web Crypto API
    ↓
encrypt(sanitized)              — TODO: DH encryption stub
    ↓
supabase.from('confessions').insert({...})
    ↓
RLS enforces user_id = auth.uid()
```

### Confession Card Action Bar (left to right)
1. **Comment** — speech bubble icon + count
2. **Upvote** — up arrow, green when active
3. **Vote count** — net score (green positive, red negative, gray zero)
4. **Downvote** — down arrow, red when active
5. **Verify Integrity** — shield icon, triggers SHA-256 comparison against blockchain hash

### Profile Page
- **Cover image:** hardcoded `/default-cover.jpg` (same for everyone)
- **Avatar:** hardcoded `/default-avatar.png` (same for everyone)
- **Info:** display_name, @username, bio (editable only on own profile)
- **No followers/following counts**
- **Confession list:** user's confessions in reverse chronological order
- **Temporal button:** positioned right of avatar. Toggles a view that:
  - Shows soft-deleted confessions in a muted red background
  - Shows original unedited content below any edited confession in red
  - Data comes from `confession_edits` table + blockchain verification (stub the blockchain part)

### Temporal Page
- Search input at top to look up usernames
- Searches both `users` table and `temporal_records` table
- Results show: username, display_name, burned status
- Clicking a result navigates to `/profile/:username`

### BURN Flow
1. User clicks BURN in the More dropdown
2. Show a confirmation modal: "This will permanently delete all your data from the database. Anything already on the blockchain cannot be removed. Type DELETE to confirm."
3. On confirm:
   a. Insert into `temporal_records` (snapshot ghost profile)
   b. Update `users` set `is_burned = TRUE, burned_at = NOW()`
   c. Delete the user row (CASCADE wipes confessions, comments, votes)
   d. Sign out
   e. Redirect to `/login`

## Security Modules (already written, in `src/security/`)
- `supabaseClient.js` — memory-based token storage, PKCE flow
- `sanitize.js` — DOMPurify-based input sanitization
- `hashIntegrity.js` — SHA-256 content hashing + verification logic
- `rateLimiter.js` — dual-layer rate limiting (client memory + DB function)

**These files are already implemented. Import and use them, do not rewrite.**

## File Structure
```
src/
├── config/
│   ├── colors.js               ← color palette (import all colors from here)
│   └── supabase.js             ← Supabase client init
├── security/
│   ├── sanitize.js             ← XSS prevention
│   ├── hashIntegrity.js        ← SHA-256 + blockchain verification
│   └── rateLimiter.js          ← rate limiting
├── components/
│   ├── ui/                     ← REUSABLE PRIMITIVES (props-driven, no business logic)
│   │   ├── Button.jsx
│   │   ├── Button.module.css
│   │   ├── Input.jsx
│   │   ├── Input.module.css
│   │   ├── Textarea.jsx
│   │   ├── Textarea.module.css
│   │   ├── Avatar.jsx
│   │   ├── Avatar.module.css
│   │   ├── Badge.jsx
│   │   ├── Badge.module.css
│   │   ├── Modal.jsx
│   │   ├── Modal.module.css
│   │   ├── IconButton.jsx
│   │   ├── IconButton.module.css
│   │   ├── Dropdown.jsx
│   │   ├── Dropdown.module.css
│   │   ├── SearchInput.jsx
│   │   ├── SearchInput.module.css
│   │   ├── Loader.jsx
│   │   ├── Loader.module.css
│   │   ├── PageHeader.jsx
│   │   └── PageHeader.module.css
│   ├── Sidebar.jsx             ← FEATURE COMPONENTS (composed from ui/ primitives)
│   ├── Sidebar.module.css
│   ├── ConfessionCard.jsx
│   ├── ConfessionCard.module.css
│   ├── ConfessionFeed.jsx
│   ├── ConfessionFeed.module.css
│   ├── ComposeBox.jsx
│   ├── ComposeBox.module.css
│   ├── ActionBar.jsx
│   ├── ActionBar.module.css
│   ├── ProfileHeader.jsx
│   ├── ProfileHeader.module.css
│   ├── TemporalConfessionCard.jsx
│   ├── TemporalConfessionCard.module.css
│   ├── UserResultCard.jsx
│   ├── UserResultCard.module.css
│   ├── ProtectedRoute.jsx
│   ├── BurnModal.jsx
│   └── BurnModal.module.css
├── pages/
│   ├── LoginPage.jsx
│   ├── LoginPage.module.css
│   ├── RegisterPage.jsx
│   ├── RegisterPage.module.css
│   ├── HomePage.jsx
│   ├── HomePage.module.css
│   ├── ProfilePage.jsx
│   ├── ProfilePage.module.css
│   ├── TemporalPage.jsx
│   └── TemporalPage.module.css
├── context/
│   └── AuthContext.jsx          ← React context for auth session
├── App.jsx
├── App.css
├── main.jsx
└── index.css                    ← global resets, font imports
```

## Design Rules
- **Modular first:** every repeated UI pattern must be a component in `components/ui/` with props. Pages and feature components import from `ui/` — they never create their own buttons, inputs, avatars, or modals from scratch. If you catch yourself writing `<button style={...}>` directly in a page, stop and use `<Button>` instead.
- All colors from `colors.js` — never hardcode hex
- CSS Modules for component styles (`.module.css`)
- Global styles only in `index.css` (resets, fonts, body)
- Font: Inter from Google Fonts (import in index.html)
- Border radius: 8px for cards, 9999px for buttons/pills/avatars
- Transitions: 0.2s ease on hovers
- Icons: inline SVGs (no icon library) — keep them simple, 20x20 viewbox. Define common icons in a `src/components/ui/icons.jsx` file as named exports so they're reused, not duplicated.
- The login/register pages should be centered on the page, clean, minimal — just a card with the form
- Mobile responsive is NOT required — desktop only is fine
- **No TypeScript** — all files are `.js` / `.jsx`, no `.ts` / `.tsx`, no type annotations

## Important Notes
- `dh_public_key` is required on signup but the actual DH encryption is a stub — just store a placeholder string like `"dh_placeholder"` for now
- The `check_confession_rate_limit` Postgres function already exists in Supabase — call it via `supabase.rpc('check_confession_rate_limit', { posting_user_id: userId })`
- RLS policies are already active — the client will get permission errors if it tries to violate them, which is correct behavior
- For the global feed, query confessions ordered by `created_at DESC` with a join on `users` for display_name and username
- Blockchain-related features (verify integrity against chain, temporal blockchain lookup) should have the UI built but the actual blockchain call stubbed with a TODO comment
