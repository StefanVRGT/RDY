# RDY Design System

## Overview

The RDY design system is a minimalist, wellness-focused design language that emphasizes clarity, calm, and simplicity. Inspired by meditation and mindfulness practices, the design uses generous white space, clean typography, and a focused color palette.

---

## Design Principles

1. **Minimalism**: Every element serves a purpose. Remove anything unnecessary.
2. **Clarity**: Clear hierarchy through size and spacing, not color or decoration.
3. **Calm**: White space and simple layouts create a peaceful user experience.
4. **Focus**: Single accent color (orange) directs attention without overwhelming.
5. **Mobile-First**: Designed primarily for mobile meditation and wellness practice.

---

## Color Palette

### Base Colors

```css
--rdy-white: #FFFFFF      /* Pure white, main background */
--rdy-black: #1A1A1A      /* Almost black, primary text */
```

### Gray Scale

```css
--rdy-gray-100: #F5F5F5   /* Subtle backgrounds */
--rdy-gray-200: #E0E0E0   /* Borders (rarely used) */
--rdy-gray-300: #CCCCCC   /* Light text */
--rdy-gray-400: #999999   /* Secondary text, subtitles */
--rdy-gray-500: #666666   /* Body text */
--rdy-gray-600: #4D4D4D   /* Dark elements */
--rdy-gray-900: #2A2A2A   /* Very dark elements */
```

### Accent Color (Primary)

```css
--rdy-orange-400: #FFA766  /* Light orange */
--rdy-orange-500: #FF8C42  /* Primary orange - use sparingly */
--rdy-orange-600: #E67A35  /* Dark orange for hover states */
```

### Semantic Colors (Use Sparingly)

```css
--rdy-success: #4CAF50
--rdy-error: #F44336
```

### Usage Guidelines

- **Primary background**: Always white (#FFFFFF)
- **Text**: Black for headers (#1A1A1A), gray for body (#666666)
- **Accent**: Orange only for active states, CTAs, and emphasis
- **Never use**: Multiple bright colors, gradients, or color combinations

---

## Typography

### Font Family

```css
font-family: 'Montserrat', 'Geist Sans', system-ui, sans-serif;
```

### Type Scale

| Class          | Size | Line Height | Letter Spacing | Weight | Case      | Usage                |
|----------------|------|-------------|----------------|--------|-----------|----------------------|
| `rdy-heading-xl` | 32px | 40px        | -0.02em        | Bold   | UPPERCASE | Page titles          |
| `rdy-heading-lg` | 24px | 32px        | -0.01em        | Bold   | UPPERCASE | Section headers      |
| `rdy-label`      | 14px | 20px        | 0.05em         | Medium | UPPERCASE | Labels, buttons      |
| `rdy-subtitle`   | 12px | 16px        | 0.05em         | Light  | UPPERCASE | Subtitles, meta info |
| `rdy-base`       | 16px | 24px        | normal         | Regular| Normal    | Body text            |

### Typography Classes

```tsx
// Page title
<h1 className="rdy-heading-xl">TODAY</h1>

// Section header
<h2 className="rdy-heading-lg">SELF-ALIGNMENT</h2>

// Subtitle
<p className="rdy-subtitle">16 MAY</p>

// Body text
<p className="rdy-body">Your paragraph content here...</p>

// Label
<span className="rdy-label">MARK COMPLETE</span>
```

### Typography Guidelines

- **Headers**: Always uppercase, bold
- **Subtitles**: Always uppercase, light weight, gray color
- **Body text**: Normal case, regular weight
- **Hierarchy**: Create hierarchy through size and spacing, not color

---

## Spacing

### Spacing Scale

```css
--rdy-xs:  8px   /* Minimal spacing */
--rdy-sm:  16px  /* Small spacing */
--rdy-md:  24px  /* Medium spacing */
--rdy-lg:  32px  /* Large spacing */
--rdy-xl:  48px  /* Extra large spacing */
--rdy-2xl: 64px  /* Section spacing */
```

### Spacing Classes

```tsx
// Section spacing
<div className="space-y-rdy-xl">...</div>

// Content padding
<div className="px-rdy-lg">...</div>

// Margins
<div className="mb-rdy-2xl">...</div>
```

### Spacing Guidelines

- **Between sections**: 48-64px (rdy-xl to rdy-2xl)
- **Within sections**: 24-32px (rdy-md to rdy-lg)
- **Between related elements**: 16px (rdy-sm)
- **Horizontal padding**: 32px (rdy-lg) for main content
- **Content width**: Max 400px, centered (use `rdy-content-width`)

---

## Components

### Buttons

#### Minimal Text Button (Primary)

```tsx
<button className="rdy-btn-primary">
  BUTTON TEXT
</button>
```

Styles:
- No background
- No border
- Uppercase text
- Black or orange text color
- Active state: 60% opacity
- Transition: opacity

#### Orange Accent Button

```tsx
<button className="rdy-btn-primary text-rdy-orange-500">
  IMPORTANT ACTION
</button>
```

Use for:
- Primary CTAs
- Important actions
- Active states

### Headers

#### Page Header

```tsx
import { RdyHeader } from '@/components/ui/rdy-header';

<RdyHeader
  title="TODAY"
  subtitle="16 MAY"
/>
```

#### Section Header

```tsx
import { RdySectionHeader } from '@/components/ui/rdy-header';

<RdySectionHeader title="TRACKING" />
```

### Tracking Circles

```tsx
import { TrackingCircle } from '@/components/ui/tracking-circle';

<TrackingCircle status="completed" size="md" />
<TrackingCircle status="active" size="md" />
<TrackingCircle status="incomplete" size="md" />
```

Status colors:
- `completed`: Black (#1A1A1A)
- `active`: Orange (#FF8C42)
- `incomplete`: Light gray (#E0E0E0)

### Cards

RDY design uses minimal cards without borders or shadows:

```tsx
// No visual card, just content with spacing
<div className="space-y-rdy-sm">
  <h2 className="rdy-heading-lg">MEDITATION</h2>
  <p className="rdy-subtitle">45 MINS</p>
</div>
```

If subtle background is needed:

```tsx
<div className="bg-rdy-gray-100 rounded-lg p-rdy-lg">
  <p className="rdy-body">Content here</p>
</div>
```

---

## Layout

### Page Structure

```tsx
<div className="min-h-screen bg-rdy-white">
  {/* Fixed hamburger menu */}
  <div className="fixed top-4 left-4 z-50">
    <button className="p-2">
      <Menu className="h-6 w-6 text-rdy-black" />
    </button>
  </div>

  {/* Main content container */}
  <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
    {/* Page header */}
    <div className="mb-rdy-2xl">
      <RdyHeader title="PAGE TITLE" subtitle="Subtitle" />
    </div>

    {/* Content sections */}
    <div className="space-y-rdy-xl">
      {/* Section content */}
    </div>

    {/* RDY branding at bottom */}
    <div className="mt-rdy-2xl text-center">
      <p className="text-rdy-lg font-bold text-rdy-black">RDY</p>
    </div>
  </div>
</div>
```

### Layout Guidelines

- **Content width**: Max 400px (`rdy-content-width` class)
- **Horizontal padding**: 32px on mobile
- **Top padding**: 64px to clear fixed header
- **Bottom padding**: 80px to clear bottom navigation
- **Centering**: Always center main content horizontally

---

## Navigation

### Hamburger Menu

```tsx
const [menuOpen, setMenuOpen] = useState(false);

// Menu button (fixed top-left)
<button onClick={() => setMenuOpen(!menuOpen)}>
  <Menu className="h-6 w-6 text-rdy-black" />
</button>

// Menu overlay
{menuOpen && (
  <div className="fixed inset-0 bg-rdy-black/50 z-40" onClick={() => setMenuOpen(false)}>
    <div className="bg-rdy-white w-64 h-full p-rdy-lg">
      <nav className="space-y-rdy-md mt-16">
        <button className="rdy-btn-primary w-full text-left">MENU ITEM</button>
      </nav>
    </div>
  </div>
)}
```

### Date Navigation

```tsx
<div className="flex items-center justify-between">
  <button onClick={goToPreviousDay}>
    <ArrowLeft className="h-5 w-5 text-rdy-gray-500" />
  </button>

  <button onClick={goToToday} className="text-rdy-sm uppercase text-rdy-orange-500">
    Back to Today
  </button>

  <button onClick={goToNextDay}>
    <ArrowRight className="h-5 w-5 text-rdy-gray-500" />
  </button>
</div>
```

---

## Icons

### Icon Usage Guidelines

- **Use sparingly**: Only when necessary for clarity
- **Size**: 20-24px for UI icons
- **Color**: Black or gray, orange for active states
- **Library**: Lucide React

### Common Icons

```tsx
import { Menu, ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

// Menu
<Menu className="h-6 w-6 text-rdy-black" />

// Navigation
<ArrowLeft className="h-5 w-5 text-rdy-gray-500" />

// Completion state
<CheckCircle2 className="h-6 w-6 text-rdy-orange-500" />
<Circle className="h-6 w-6 text-rdy-gray-300" />
```

---

## Interactions

### Touch/Click States

All interactive elements should have a simple opacity transition:

```tsx
<button className="active:opacity-60 transition-opacity">
  BUTTON TEXT
</button>
```

### Loading States

```tsx
<div className="w-10 h-10 rounded-full bg-rdy-orange-500 animate-pulse" />
```

### Transitions

- **Duration**: 200ms for most transitions
- **Easing**: Default ease
- **Properties**: Opacity, transform only (performant)

---

## Images

### Image Guidelines

- **Style**: Professional, calming, wellness-focused
- **Color**: Natural tones, muted colors
- **Subjects**: Meditation, nature, mindfulness
- **Treatment**: High quality, clean composition
- **Examples**: Meditation bells, meditation poses, natural elements

### Image Placeholders

```tsx
<div className="w-32 h-32 bg-rdy-gray-100 rounded-full flex items-center justify-center">
  <span className="text-4xl">🔔</span>
</div>
```

---

## Accessibility

### Color Contrast

- Black text on white: 21:1 (AAA)
- Gray-500 text on white: 7:1 (AA)
- Orange on white: 3.4:1 (AA for large text)

### Touch Targets

- Minimum size: 44x44px
- Spacing: 8px minimum between targets

### Focus States

```tsx
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rdy-orange-500">
  BUTTON
</button>
```

---

## Implementation Checklist

### For New Pages

- [ ] White background (`bg-rdy-white`)
- [ ] Fixed hamburger menu (top-left)
- [ ] Content container with max width (`rdy-content-width`)
- [ ] Horizontal padding 32px (`px-rdy-lg`)
- [ ] Page header with uppercase title
- [ ] Generous spacing between sections (48-64px)
- [ ] RDY branding at bottom
- [ ] No borders or shadows on cards
- [ ] Minimal icon usage
- [ ] Touch-friendly interactions

### For Components

- [ ] Uppercase text for headers and labels
- [ ] Black text for primary content
- [ ] Gray text for secondary content
- [ ] Orange only for emphasis/active states
- [ ] Simple opacity transitions
- [ ] No gradients or multiple colors
- [ ] Clean, minimal design

---

## Examples

### Complete Page Example

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft } from 'lucide-react';
import { RdyHeader } from '@/components/ui/rdy-header';

export default function ExamplePage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 active:opacity-60 transition-opacity"
        >
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Header */}
        <div className="mb-rdy-2xl">
          <RdyHeader title="PAGE TITLE" subtitle="Subtitle" />
        </div>

        {/* Content Sections */}
        <div className="space-y-rdy-xl">
          <div className="text-center space-y-rdy-sm">
            <h2 className="rdy-heading-lg">SECTION TITLE</h2>
            <p className="rdy-subtitle">SUBTITLE</p>
          </div>

          <div>
            <p className="rdy-body text-center">
              Body text content here with proper spacing and typography.
            </p>
          </div>

          <div className="flex justify-center">
            <button className="rdy-btn-primary text-rdy-orange-500">
              CALL TO ACTION
            </button>
          </div>
        </div>

        {/* RDY Branding */}
        <div className="mt-rdy-2xl text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Migration Notes

### From Old Design to RDY

1. **Remove**: All dark mode styles, purple colors, borders, shadows, gradients
2. **Change**: Background to white, primary color to orange
3. **Simplify**: Remove complex UI components, reduce icon usage
4. **Increase**: White space between elements (double or triple spacing)
5. **Update**: Typography to uppercase for headers
6. **Refactor**: Cards to minimal containers without borders

### Color Mapping

| Old Color | New Color | Usage |
|-----------|-----------|-------|
| `twilight-500` (purple) | `rdy-orange-500` | Accent color |
| `surface-900` (dark gray) | `rdy-white` | Background |
| `text-white` | `text-rdy-black` | Primary text |
| `text-gray-400` | `text-rdy-gray-400` | Secondary text |

---

## Resources

### Design Reference

- See `/documents/` folder for original design screenshots
- See `/DESIGN_GAP_ANALYSIS.md` for complete analysis

### Component Library

- `/src/components/ui/rdy-header.tsx` - Page and section headers
- `/src/components/ui/tracking-circle.tsx` - Status indicators
- `/src/components/ui/button.tsx` - Button variants (use `variant="rdy"`)

### Example Pages

- `/src/app/mentee/calendar/page.tsx` - Main calendar view
- `/src/app/mentee/calendar/tracking/page.tsx` - Tracking grid
- `/src/app/mentee/exercise/[id]/page.tsx` - Exercise detail
- `/src/app/mentee/diary/page.tsx` - Diary entry

---

## Support

For questions or clarifications about the design system, refer to:
- This documentation (`DESIGN_SYSTEM.md`)
- Gap analysis (`DESIGN_GAP_ANALYSIS.md`)
- Design screenshots (`/documents/`)
