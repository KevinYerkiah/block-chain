// =============================================================================
// Color Palette — Confession Platform
// =============================================================================
// Import from here. Never hardcode hex values in components.
// Usage: import { colors } from '../config/colors';
// =============================================================================

export const colors = {

    // ── PRIMARY (orange family) ──
    primary:        '#E8601C',     // main brand orange — buttons, active nav, links
    primaryHover:   '#D4520F',     // darker on hover/press
    primaryLight:   '#FDEAD7',     // soft orange tint — backgrounds, highlights
    primaryFaint:   '#FFF7F2',     // barely-there orange — page backgrounds, hover states

    // ── NEUTRALS ──
    background:     '#FFFFFF',     // page/card background
    surface:        '#FAFAF9',     // slightly warm off-white for secondary surfaces
    border:         '#E7E5E4',     // dividers, card borders, input borders
    borderLight:    '#F5F5F4',     // subtle separators (between confessions)

    // ── TEXT ──
    textPrimary:    '#1C1917',     // headings, display names, confession body
    textSecondary:  '#78716C',     // @usernames, timestamps, placeholders
    textMuted:      '#A8A29E',     // disabled text, hints
    textOnPrimary:  '#FFFFFF',     // text on primary-colored buttons

    // ── FEEDBACK ──
    success:        '#16A34A',     // verified integrity, upvote active
    successLight:   '#DCFCE7',     // success background tint
    danger:         '#DC2626',     // downvote active, burn button, errors
    dangerLight:    '#FEE2E2',     // error backgrounds, deleted confession tint
    dangerFaint:    '#FEF2F2',     // soft red for temporal deleted confessions
    warning:        '#F59E0B',     // pending states (edit window, syncing)
    warningLight:   '#FEF3C7',     // warning background tint

    // ── INTERACTIVE ──
    inputBg:        '#FFFFFF',     // input/textarea background
    inputBorder:    '#D6D3D1',     // input border default
    inputFocus:     '#E8601C',     // input border on focus (matches primary)
    hoverBg:        'rgba(232, 96, 28, 0.06)',  // hover state for buttons/nav items

    // ── SIDEBAR ──
    sidebarBg:      '#FFFFFF',     // sidebar background
    sidebarActive:  '#FDEAD7',     // active nav item background
    sidebarText:    '#1C1917',     // nav item text
    sidebarIcon:    '#78716C',     // nav item icons (inactive)

    // ── SHADOWS ──
    shadow:         '0 1px 3px rgba(28, 25, 23, 0.08)',   // cards, dropdowns
    shadowMd:       '0 4px 12px rgba(28, 25, 23, 0.10)',  // modals, elevated elements
};

export default colors;
