# Design Specification

## ⚠️ Modular Component Rule
Every page described below MUST be built from reusable primitives in `src/components/ui/`. When this spec says "button" it means use `<Button>`. When it says "input" it means use `<Input>`. When it says "avatar" it means use `<Avatar>`. **Build the `ui/` primitives FIRST, then compose the feature components and pages from them.**

## Global Styles

### Typography
- Font family: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- Import Inter from Google Fonts in `index.html`: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`
- Base font size: 15px
- Display names: 15px, weight 700
- Usernames & timestamps: 14px, weight 400, textSecondary color
- Confession body text: 15px, weight 400, line-height 1.5
- Page titles: 20px, weight 700
- Button text: 15px, weight 600

### Spacing
- Page padding: 0 (sidebar + content fill viewport)
- Content column padding: 0 16px
- Card padding: 16px
- Gap between confession cards: 0 (separated by 1px border)
- Sidebar padding: 12px

### Borders & Shapes
- Cards: no border-radius (they stack flush), 1px bottom border using `border` color
- Buttons: border-radius 9999px (fully rounded pills)
- Avatars: border-radius 50%
- Input fields: border-radius 8px
- Modals: border-radius 16px
- Dropdown menus: border-radius 12px

---

## Login Page (`/login`)

Centered card on a `surface` colored background, full viewport height.

**Card layout:**
- Width: 400px, padding: 40px, background: `background`, box-shadow: `shadow`, border-radius: 16px
- Logo/brand mark at top (just the text "Confessions" in 28px bold, `primary` color)
- Subtitle: "Share your truth" in `textSecondary`, 15px
- 24px gap
- Email input: full width, height 48px, `inputBorder` border, `inputFocus` on focus (2px), 8px radius
- 12px gap
- Password input: same styling, type="password"
- 16px gap
- "Log in" button: full width, height 48px, `primary` background, `textOnPrimary` text, 9999px radius. On hover: `primaryHover`. Disabled state: opacity 0.5
- 16px gap
- Divider line with "or" text centered
- 16px gap
- "Don't have an account? Sign up" — "Sign up" is a link in `primary` color → navigates to `/register`

**Error handling:** show error text in `danger` color below the button if login fails.

---

## Register Page (`/register`)

Same centered card layout as login.

**Fields (top to bottom):**
1. Email input
2. Username input (add note: "This is public and permanent")
3. Display name input
4. Password input (add note: "Minimum 8 characters")
5. Confirm password input

**Button:** "Create Account" — same style as login button.

**Bottom:** "Already have an account? Log in" → navigates to `/login`

**Validation:**
- Username: only alphanumeric + underscores, 3-50 chars (use `sanitizeUsername` from sanitize.js)
- Display name: sanitized, 1-100 chars (use `sanitizeDisplayName`)
- Password: min 8 chars, must match confirm
- Email: basic email format check

**On submit:**
1. `supabase.auth.signUp({ email, password })`
2. If success, insert into `users` table: `{ id: auth.uid(), username, display_name, email, password_hash: 'managed_by_supabase', dh_public_key: 'dh_placeholder' }`
3. Redirect to `/`

---

## Home Page (`/`) — Global Feed

### Header bar
- Sticky top, height 53px, border-bottom 1px `border`
- Title: "Home" in 20px bold, padding-left 16px
- Background: `background` with slight blur/transparency (optional)

### Compose Box (top of feed, below header)
- Full width, border-bottom 1px `border`, padding 16px
- Left: 48x48 avatar (hardcoded default), border-radius 50%
- Right of avatar: textarea, placeholder "What's happening?" in `textSecondary`
  - No visible border, resize: none, font-size 18px
  - Auto-grows with content (min 3 rows)
- Below textarea, right-aligned row:
  - Character count "0/5000" in `textMuted`, 12px
  - "Post" button: `primary` bg, `textOnPrimary` text, 9999px radius, padding 8px 20px
  - Disabled (opacity 0.5) when empty or posting

### Confession Feed
- Query: `supabase.from('confessions').select('*, users(display_name, username)').eq('is_deleted', false).order('created_at', { ascending: false }).limit(50)`
- Each confession renders a `ConfessionCard`
- Infinite scroll or "Load more" button at bottom (simple approach: Load more)

### ConfessionCard layout
```
┌──────────────────────────────────────────┐
│ [Avatar]  Display Name @username · 23s   │
│           Confession text goes here and  │
│           can span multiple lines...     │
│                                          │
│           💬 12    ▲ 158 ▼    🛡 Verify  │
└──────────────────────────────────────────┘
```
- Avatar: 48x48, hardcoded default
- Name: 15px bold `textPrimary`
- @username: 14px `textSecondary`
- Separator dot: `textSecondary`
- Time: relative (23s, 5m, 2h, 3d) in 14px `textSecondary`
- Body: 15px `textPrimary`, line-height 1.5, margin-top 4px
- Action bar: 32px gap between groups, 13px text, `textSecondary` default

**Action bar icons (inline SVG, 18x18):**
1. Comment: speech bubble outline → count
2. Upvote arrow → Vote count (colored by sign) → Downvote arrow
3. Shield icon → "Verify" text

**Upvote active:** arrow fills `success`, text turns `success`
**Downvote active:** arrow fills `danger`, text turns `danger`
**Verify result:** shield turns green/amber/red based on status

---

## Profile Page (`/profile/:username`)

### Cover & Avatar section
- Cover: full width of content column, height 200px, hardcoded `/default-cover.jpg`, object-fit: cover
- Avatar: 120x120, positioned to overlap the bottom of the cover by 60px (using negative margin-top: -60px), border: 4px solid `background`, border-radius 50%
- **Temporal button:** right-aligned, at the level of the avatar. Outlined button (1px `border`, `textPrimary` text, 9999px radius). Text: "Temporal". On click toggles temporal view mode.

### Profile info (below avatar, with padding to clear the overlap)
- Display name: 20px bold
- @username: 15px `textSecondary`
- Bio: 15px `textPrimary`, margin-top 8px
- If viewing own profile: small "Edit profile" outlined button somewhere near the name

### Confession list
- Same `ConfessionCard` components, filtered to this user
- Query: `supabase.from('confessions').select('*, users(display_name, username)').eq('user_id', profileUserId).order('created_at', { ascending: false })`

### Temporal mode (toggled by the Temporal button)
When active:
- The button gets a `primary` background (indicating active state)
- Deleted confessions appear in the list with `dangerFaint` background and `danger` left border (4px)
- Edited confessions show the current version normally, with the old version underneath in a card with `dangerFaint` background, prefixed with "Original:" in `danger` colored 12px label
- Data source: `confession_edits` table joined with confessions, plus `is_deleted` confessions
- Blockchain verification for these is stubbed: show a message "Blockchain verification pending — awaiting integration"

---

## Temporal Page (`/temporal`)

### Header
- "Temporal" title, same header bar style as Home

### Search section
- Full-width search input, height 48px, border-radius 9999px, `inputBorder`, icon: magnifying glass SVG on the left inside the input (padding-left to accommodate)
- Placeholder: "Search usernames..."
- Debounce: 300ms after typing stops, fire the search

### Search logic
- Query `users` table: `supabase.from('users').select('username, display_name, is_burned').ilike('username', '%searchTerm%').limit(20)`
- Also query `temporal_records`: `supabase.from('temporal_records').select('username, display_name, burned_at').ilike('username', '%searchTerm%').limit(20)`
- Merge results, deduplicate by username, mark burned ones

### Result cards
- Each result: a horizontal card, padding 12px 16px, border-bottom 1px `border`
- Left: 40x40 avatar (default)
- Center: display_name (bold 15px) + @username (14px `textSecondary`)
- Right: if burned, show a red "Burned" badge (pill shape, `danger` bg, white text, 11px, padding 2px 8px)
- Clicking a result → navigate to `/profile/:username`
- For burned users, the profile page should fetch from `temporal_records` and attempt blockchain lookup (stubbed)

### Empty state
- Before searching: "Search for usernames to find their confessions — even if they've been burned."
- No results: "No users found matching that username."

---

## Sidebar

### Nav items
Each item: 48px height, padding 0 16px, border-radius 9999px, gap 16px between icon and label.
- Default: `sidebarText` color, `sidebarIcon` for the icon
- Hover: `hoverBg` background
- Active (current route): `primary` color for both icon and text, `sidebarActive` background, font-weight 700

**Items:**
1. **Global** — house/home icon → links to `/`
2. **Temporal** — document/clock icon → links to `/temporal`
3. **Profile** — person icon → links to `/profile/{currentUser.username}`
4. **More** — three dots icon → opens dropdown menu

### More dropdown
- Positioned above the More button (opens upward)
- Background: `background`, border-radius 12px, box-shadow: `shadowMd`
- Two items:
  1. "Sign Out" — normal text, logout icon. Calls signOut flow.
  2. "BURN" — `danger` colored text, fire icon. Opens BurnModal.

### User pill (bottom of sidebar)
- Positioned at absolute bottom with margin
- Shows: 40x40 avatar, display_name (bold, 14px, truncated), @username (13px, `textSecondary`, truncated)
- Clicking it → navigate to own profile

---

## Burn Modal

- Overlay: full viewport, background rgba(0,0,0,0.5), z-index 1000
- Modal card: 400px wide, centered, `background`, border-radius 16px, padding 32px
- Title: "Burn Account" in `danger` color, 20px bold
- Warning icon (fire SVG) centered above title
- Body text: "This will permanently delete all your data from the database. Anything already written to the blockchain will remain forever. This action cannot be undone."
- Input: "Type DELETE to confirm" — only enables the button when value === "DELETE"
- Button: full width, `danger` background, white text, "Burn Everything"
- Cancel link below: "Cancel" in `textSecondary`
