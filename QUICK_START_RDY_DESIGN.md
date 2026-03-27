# Quick Start: RDY Design System

## TL;DR

The RDY app now uses a **light, minimalist design** with:
- ✅ White background
- ✅ Orange accent color (#FF8C42)
- ✅ Uppercase headers
- ✅ Generous spacing
- ✅ No borders or shadows

---

## Creating a New Page

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { RdyHeader } from '@/components/ui/rdy-header';

export default function MyNewPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Hamburger Menu - Always include */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 active:opacity-60 transition-opacity"
        >
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Main Content - Always wrap in this container */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Header - Use RdyHeader component */}
        <div className="mb-rdy-2xl">
          <RdyHeader title="PAGE TITLE" subtitle="Subtitle text" />
        </div>

        {/* Content - Use generous spacing */}
        <div className="space-y-rdy-xl">
          {/* Your content here */}
        </div>

        {/* RDY Branding - Always include at bottom */}
        <div className="mt-rdy-2xl text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Common Elements

### Page Header
```tsx
<RdyHeader title="TODAY" subtitle="16 MAY" />
```

### Section Header
```tsx
<h2 className="rdy-heading-lg">MEDITATION</h2>
```

### Subtitle
```tsx
<p className="rdy-subtitle">45 MINS</p>
```

### Body Text
```tsx
<p className="rdy-body">Your paragraph text here...</p>
```

### Button
```tsx
<button className="rdy-btn-primary text-rdy-orange-500">
  CLICK ME
</button>
```

### Completion Indicator
```tsx
import { CheckCircle2, Circle } from 'lucide-react';

<button onClick={handleToggle}>
  {completed ? (
    <CheckCircle2 className="h-6 w-6 text-rdy-orange-500" />
  ) : (
    <Circle className="h-6 w-6 text-rdy-gray-300" />
  )}
</button>
```

### Tracking Circle
```tsx
import { TrackingCircle } from '@/components/ui/tracking-circle';

<TrackingCircle status="completed" size="md" />
<TrackingCircle status="active" size="md" />
<TrackingCircle status="incomplete" size="md" />
```

---

## Color Usage

```tsx
// Backgrounds
bg-rdy-white           // Main background (always)
bg-rdy-gray-100        // Subtle backgrounds

// Text
text-rdy-black         // Headers, primary text
text-rdy-gray-500      // Body text
text-rdy-gray-400      // Secondary text
text-rdy-orange-500    // Accent, CTAs, active states

// Interactive
text-rdy-orange-500    // Links, buttons
hover:text-rdy-orange-600
active:opacity-60      // Touch feedback
```

---

## Spacing

```tsx
// Between sections
space-y-rdy-xl         // 48px
mb-rdy-2xl             // 64px

// Within sections
space-y-rdy-md         // 24px
gap-rdy-sm             // 16px

// Padding
px-rdy-lg              // 32px horizontal
py-rdy-md              // 24px vertical
```

---

## Typography Classes

```tsx
rdy-heading-xl    // 32px, bold, uppercase - Page titles
rdy-heading-lg    // 24px, bold, uppercase - Section headers
rdy-label         // 14px, medium, uppercase - Labels/buttons
rdy-subtitle      // 12px, light, uppercase - Subtitles
rdy-body          // 16px, regular - Body text
```

---

## Do's and Don'ts

### ✅ Do
- Use white background always
- Make headers uppercase
- Use generous spacing (48-64px between sections)
- Use orange ONLY for accents/active states
- Keep designs minimal and clean
- Center content (max-width 400px)
- Use simple opacity transitions

### ❌ Don't
- Use dark backgrounds
- Use purple colors (old design)
- Add borders or shadows
- Use multiple accent colors
- Make designs complex
- Pack content densely
- Use gradients

---

## Example Sections

### Exercise List Item
```tsx
<div className="space-y-rdy-sm text-center">
  <h2 className="rdy-heading-lg">MEDITATION</h2>
  <p className="rdy-subtitle">45 MINS</p>
</div>
```

### Loading State
```tsx
<div className="flex items-center justify-center py-rdy-xl">
  <div className="w-10 h-10 rounded-full bg-rdy-orange-500 animate-pulse" />
</div>
```

### Empty State
```tsx
<div className="text-center py-rdy-2xl">
  <p className="rdy-body">No items found</p>
</div>
```

### Date Navigation
```tsx
import { ArrowLeft, ArrowRight } from 'lucide-react';

<div className="flex items-center justify-between mb-rdy-md">
  <button onClick={goPrevious} className="p-2 active:opacity-60">
    <ArrowLeft className="h-5 w-5 text-rdy-gray-500" />
  </button>

  <button onClick={goToday} className="text-rdy-sm uppercase text-rdy-orange-500">
    Back to Today
  </button>

  <button onClick={goNext} className="p-2 active:opacity-60">
    <ArrowRight className="h-5 w-5 text-rdy-gray-500" />
  </button>
</div>
```

---

## Importing Components

```tsx
// Headers
import { RdyHeader, RdySectionHeader } from '@/components/ui/rdy-header';

// Tracking circles
import { TrackingCircle } from '@/components/ui/tracking-circle';

// Icons (use sparingly)
import { Menu, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
```

---

## Reference Files

- Full design system: `DESIGN_SYSTEM.md`
- Implementation details: `REDESIGN_IMPLEMENTATION_SUMMARY.md`
- Gap analysis: `DESIGN_GAP_ANALYSIS.md`
- Design screenshots: `/documents/`

---

## Need Help?

1. Check existing pages: `/src/app/mentee/calendar/page.tsx`
2. See `DESIGN_SYSTEM.md` for complete guidelines
3. Look at component library: `/src/components/ui/`

---

**Remember**: When in doubt, keep it **simple**, **white**, and **spacious**!
