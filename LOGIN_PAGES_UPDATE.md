# Login Pages Update - RDY Design

## Overview

The login experience has been completely redesigned to match the RDY minimalist aesthetic with a beautiful video hero, clean typography, and simple flow.

---

## What Was Changed

### 1. Landing Page (`src/app/page.tsx`) ✅

**Before:**
- Dark background with purple accents
- Complex layout with multiple sections
- Small video with gradient overlay

**After:**
- Full-screen video hero
- Minimal white overlay for readability
- Large "RDY" text (80px - 120px)
- "START YOUR JOURNEY" subtitle
- Simple "BEGIN →" button in orange
- Clean, centered layout

**Key Features:**
```tsx
- Video: Full screen, autoplay, loop, muted
- Text: "RDY" in massive bold letters
- Subtitle: "START YOUR JOURNEY" in uppercase
- Button: Minimal orange text with arrow
- Background: White with subtle overlay
```

### 2. Sign In Page (`src/app/auth/signin/page.tsx`) ✅

**Before:**
- Dark gray background
- Purple button
- Complex card layout

**After:**
- Pure white background
- "RDY" logo (60px)
- "SIGN IN TO CONTINUE" subtitle
- Simple "SIGN IN →" orange button
- Clean error messages
- Minimal layout

**Key Features:**
```tsx
- Background: Pure white (#FFFFFF)
- Logo: "RDY" large and bold
- Button: Orange text (#FF8C42), uppercase
- Errors: Clean red background with white text
- Loading: Orange pulsing circle
```

### 3. Keycloak Login Theme ✅

**Created:**
- Complete custom Keycloak theme
- Matches RDY design system
- Ready to deploy

**Location:** `keycloak/themes/rdy/`

**Features:**
- White background
- "RDY" header (60px)
- Orange submit button
- Clean input fields (gray background)
- No borders or shadows
- Uppercase labels
- Error/success messages styled
- Mobile responsive

---

## Files Modified/Created

### Modified
1. `src/app/page.tsx` - Landing page with video hero
2. `src/app/auth/signin/page.tsx` - Clean sign-in page

### Created
1. `keycloak/themes/rdy/theme.properties` - Theme configuration
2. `keycloak/themes/rdy/login/resources/css/rdy.css` - Custom CSS
3. `scripts/apply-keycloak-theme.sh` - Setup script
4. `KEYCLOAK_THEME_GUIDE.md` - Complete customization guide
5. `LOGIN_PAGES_UPDATE.md` - This document

### Backed Up
1. `src/app/page.backup.tsx` - Original landing page
2. `src/app/auth/signin/page.backup.tsx` - Original signin page

---

## Design Details

### Landing Page

```
┌─────────────────────────────────┐
│                                 │
│     [Full-screen Video]         │
│                                 │
│           RDY                   │  ← 80-120px, bold
│     START YOUR JOURNEY          │  ← 24px, uppercase
│                                 │
│         BEGIN →                 │  ← Orange button
│                                 │
└─────────────────────────────────┘
```

### Sign In Page

```
┌─────────────────────────────────┐
│                                 │
│           RDY                   │  ← 60px, bold
│   SIGN IN TO CONTINUE           │  ← 12px, gray
│                                 │
│   ┌───────────────────┐         │
│   │ Email/Username    │         │  ← Gray input
│   └───────────────────┘         │
│   ┌───────────────────┐         │
│   │ Password          │         │
│   └───────────────────┘         │
│                                 │
│   ┌───────────────────┐         │
│   │   SIGN IN →       │         │  ← Orange button
│   └───────────────────┘         │
│                                 │
└─────────────────────────────────┘
```

### Keycloak Login Page

```
┌─────────────────────────────────┐
│                                 │
│           RDY                   │  ← 60px, bold
│   SIGN IN TO CONTINUE           │  ← Subtitle
│                                 │
│   EMAIL OR USERNAME             │  ← Label (uppercase)
│   ┌───────────────────┐         │
│   │                   │         │  ← Gray background
│   └───────────────────┘         │
│                                 │
│   PASSWORD                      │  ← Label (uppercase)
│   ┌───────────────────┐         │
│   │                   │         │
│   └───────────────────┘         │
│                                 │
│   ┌───────────────────┐         │
│   │   SIGN IN         │         │  ← Orange button
│   └───────────────────┘         │
│                                 │
│   Forgot Password?              │  ← Orange link
│                                 │
└─────────────────────────────────┘
```

---

## Video Requirements

### Video Location
Place your background video at: `/public/videos/background.mp4`

### Video Specifications
- **Format**: MP4 (H.264 codec recommended)
- **Resolution**: 1920x1080 or higher
- **Aspect Ratio**: 16:9 preferred
- **Duration**: 15-60 seconds (will loop)
- **File Size**: < 10MB for optimal loading
- **Content**: Calm, meditation-related imagery (nature, meditation poses, peaceful scenes)

### Video Tips
- Use slow-moving footage (meditation, nature, abstract)
- Keep colors muted and natural
- Ensure good contrast for text readability
- Test with the white overlay (40% opacity)
- Consider using royalty-free stock footage from:
  - Pexels Videos
  - Unsplash Videos
  - Pixabay Videos

### Fallback
If video doesn't load, the page shows:
- White background
- All text remains visible
- No broken layout

---

## Setup Instructions

### 1. Add Background Video

```bash
# Place your video in the public folder
cp your-video.mp4 public/videos/background.mp4
```

### 2. Test Landing Page

```bash
npm run dev
# Visit http://localhost:3000
```

You should see:
- Full-screen video playing
- "RDY" large text
- "START YOUR JOURNEY" subtitle
- "BEGIN →" button

### 3. Apply Keycloak Theme

```bash
# Make sure Keycloak is running
docker-compose up -d keycloak

# Run the setup script
./scripts/apply-keycloak-theme.sh
```

### 4. Configure Keycloak

1. Go to: `http://localhost:8080/admin`
2. Login with admin credentials
3. Select your realm (e.g., "rdy-realm")
4. Go to: **Realm Settings** → **Themes**
5. Under **Login Theme**, select **"rdy"**
6. Click **Save**
7. Clear browser cache
8. Test login page

---

## Color Palette

### Landing Page
- Background: White (#FFFFFF) with video
- Video overlay: White at 40% opacity
- Text: Black (#1A1A1A)
- Button: Orange (#FF8C42)

### Sign In Page
- Background: Pure white (#FFFFFF)
- Text: Black (#1A1A1A)
- Button: Orange (#FF8C42)
- Errors: Red background (#F44336), white text

### Keycloak Theme
- Background: White (#FFFFFF)
- Text: Black (#1A1A1A)
- Inputs: Light gray background (#F5F5F5)
- Button: Orange (#FF8C42)
- Links: Orange (#FF8C42)
- Errors: Red (#F44336)
- Success: Green (#4CAF50)

---

## Typography

### Landing Page
- "RDY": 80-120px, bold, black
- Subtitle: 24px, bold, uppercase, gray
- Button: 18px, uppercase, bold, orange

### Sign In Page
- "RDY": 60px, bold, black
- Subtitle: 12px, uppercase, gray
- Button: 18px, uppercase, bold, orange

### Keycloak
- Header: 60px, bold, black, uppercase
- Labels: 14px, medium, uppercase, black
- Inputs: 16px, regular, black
- Button: 18px, bold, uppercase, white
- Links: 14px, uppercase, orange

---

## Testing Checklist

### Landing Page
- [ ] Video loads and plays automatically
- [ ] Video loops seamlessly
- [ ] Text is readable over video
- [ ] Button works and redirects to signin
- [ ] Mobile responsive
- [ ] Fallback works if video fails

### Sign In Page
- [ ] White background displays
- [ ] "RDY" logo shows correctly
- [ ] Sign in button is orange
- [ ] Redirects to Keycloak
- [ ] Error messages styled correctly
- [ ] Loading state shows orange circle

### Keycloak Theme
- [ ] Theme appears in Keycloak admin
- [ ] Login page uses white background
- [ ] "RDY" header displays
- [ ] Inputs have gray background
- [ ] Submit button is orange
- [ ] Error messages are red with white text
- [ ] Links are orange
- [ ] Mobile responsive

---

## Common Issues & Solutions

### Video Not Playing
**Problem**: Video doesn't autoplay
**Solution**:
- Check file exists at `/public/videos/background.mp4`
- Ensure video format is MP4
- Check browser console for errors
- Try different browser (some block autoplay)

### Keycloak Theme Not Showing
**Problem**: Keycloak still shows default theme
**Solution**:
```bash
# Re-run setup script
./scripts/apply-keycloak-theme.sh

# Or manually:
docker cp keycloak/themes/rdy keycloak:/opt/keycloak/themes/
docker restart keycloak

# Then configure in admin console
```

### Button Not Orange
**Problem**: Colors not matching RDY design
**Solution**:
- Clear browser cache (Ctrl+Shift+R)
- Check CSS is loading in dev tools
- Verify Tailwind config is correct

### Mobile Not Working
**Problem**: Layout broken on mobile
**Solution**:
- All pages are responsive by default
- Check viewport meta tag exists
- Test in Chrome DevTools mobile view

---

## Advanced Customization

### Change Video Overlay Opacity

In `src/app/page.tsx`:
```tsx
<div className="absolute inset-0 bg-rdy-white/40"></div>
                                         // ↑ Change this number
                                         // 40 = 40% opacity
                                         // Lower = more video visible
                                         // Higher = more white
```

### Add Multiple Videos

```tsx
<video autoPlay loop muted playsInline>
  <source src="/videos/background.mp4" type="video/mp4" />
  <source src="/videos/background.webm" type="video/webm" />
</video>
```

### Customize Keycloak Header

Edit `keycloak/themes/rdy/login/resources/css/rdy.css`:
```css
#kc-header-wrapper {
  font-size: 60px;  /* Change size */
  color: #1A1A1A;   /* Change color */
}
```

---

## Next Steps

1. ✅ Landing page redesigned
2. ✅ Sign in page redesigned
3. ✅ Keycloak theme created
4. ⏳ Add actual background video
5. ⏳ Apply Keycloak theme to your instance
6. ⏳ Test complete login flow
7. ⏳ Update error page styling (optional)

---

## Resources

- **Landing Page**: `src/app/page.tsx`
- **Sign In**: `src/app/auth/signin/page.tsx`
- **Keycloak Theme**: `keycloak/themes/rdy/`
- **Setup Script**: `scripts/apply-keycloak-theme.sh`
- **Full Guide**: `KEYCLOAK_THEME_GUIDE.md`
- **Design System**: `DESIGN_SYSTEM.md`

---

## Summary

✨ **Login Experience Redesigned:**

- 🎥 **Landing Page**: Full-screen video hero with "RDY" and "START YOUR JOURNEY"
- 🔐 **Sign In Page**: Clean white page with orange button
- 🎨 **Keycloak Theme**: Custom theme matching RDY design
- 📱 **Mobile Ready**: All pages responsive
- 🚀 **Easy Setup**: One-command Keycloak theme deployment

The entire login flow now matches the RDY minimalist design with white backgrounds, orange accents, and clean typography!
