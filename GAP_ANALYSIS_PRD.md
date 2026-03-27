# RDY Gap Analysis & Closure PRD

**Date**: 2026-01-25  
**Status**: CRITICAL - Major UX Misalignment  
**Priority**: HIGH

---

## Executive Summary

Ralph Ultra successfully implemented all 61 technical stories, but **the user experience does not match the client's vision**. The system was built as a **desktop-first management platform** when it should be a **mobile-first mentee experience**.

### The Core Problem

**Client Vision**: "Welcome back Franz Josef, **today**" - A simple, time-based daily view as the main interface.

**What Was Built**: A generic dashboard with calendar buried in navigation.

---

## Gap Analysis

### 1. Landing Page Experience

| Aspect           | Client Wanted                                 | What Was Built                       | Impact                   |
| ---------------- | --------------------------------------------- | ------------------------------------ | ------------------------ |
| **First Screen** | TODAY view with scheduled exercises and times | Generic dashboard redirect           | HIGH - Wrong entry point |
| **Greeting**     | "Welcome back [Name], today"                  | No personalized greeting on calendar | MEDIUM - Less engaging   |
| **Focus**        | Today's schedule front and center             | Calendar is one of many nav items    | HIGH - Wrong hierarchy   |

**Evidence**:

- Client transcript: "wenn du dich einloggen würdest, würde hier stehen, welcome back Franz Josef, today"
- Current: `/mentee/page.tsx` redirects to `/mentee/calendar` (correct) but no "today" emphasis
- `/dashboard/page.tsx` shows generic role-based content, not today-focused

### 2. Time Management UI

| Aspect           | Client Wanted                                           | What Was Built                  | Impact                    |
| ---------------- | ------------------------------------------------------- | ------------------------------- | ------------------------- |
| **Time Picker**  | "Rädchen" (scroll wheel) - iOS-style hour/minute picker | Drag-and-drop implementation    | HIGH - Wrong interaction  |
| **Increments**   | 5-minute increments ("5 Minuten Sprünge")               | Not specified                   | MEDIUM - Usability        |
| **Bulk Setting** | Set times for whole week at once                        | Individual day adjustments only | HIGH - Missing efficiency |
| **Simplicity**   | "sehr simpel" - very simple                             | Complex drag-and-drop           | HIGH - Too complicated    |

**Evidence**:

- Story S6.10: "Scroll wheel time picker (not drag-and-drop for time)" - but testCommand: "true" means this wasn't actually built
- Story S6.11: Implemented drag-and-drop which client explicitly rejected: "Dragon Drop macht aber jetzt nur, was vorher und nachher kommt, das sind ja keine Uhrzeiten"
- Client wanted: "dann kannst du rein-dragen, das ist schon gut. Aber es ist wahrscheinlich dann, könnte in der Bedienung dann kompliziert sein"

### 3. Visual Identity

| Aspect           | Client Wanted                                           | What Was Built                                       | Impact                       |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| **Color Scheme** | Defined "Farbwelt" (color world)                        | Twilight colors defined but not consistently applied | HIGH - No visual identity    |
| **Aesthetic**    | "sehr schlicht, sehr einfach" (very plain, very simple) | Generic shadcn/ui styling                            | MEDIUM - Missing personality |
| **Minimalism**   | Clean, simple, no complicated navigation                | Complex nav structure                                | HIGH - Too busy              |

**Evidence**:

- `tailwind.config.ts` HAS twilight colors (lines 15-27) but components use generic `bg-gray-*`, `text-white`
- Should use `bg-twilight-*`, `text-twilight-*` for brand consistency

### 4. Completion Interaction

| Aspect           | Client Wanted                                                                               | What Was Built                     | Impact                             |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| **Marking Done** | Simple checkbox - "Häkchen"                                                                 | Checkbox exists but buried in card | MEDIUM - Correct but not prominent |
| **Video Replay** | "nicht jedes Mal das Erklärvideo vorne haben willst" - don't need to watch video every time | Video popup on tap                 | LOW - Correct behavior             |

**Evidence**:

- Client: "Mach doch einfach ein Häkchen auf der Seite. Wo du sagen kannst, erledigt. Ohne da... Und wenn du draufblickst, nicht als Häkchen, dann geht halt das Ding auf"
- Implementation is mostly correct here

### 5. Device Priority

| Aspect                 | Client Wanted                                         | What Was Built                  | Impact                           |
| ---------------------- | ----------------------------------------------------- | ------------------------------- | -------------------------------- |
| **Primary Device**     | Mobile PWA ("Mobile-App", "kommt aus dem Handy raus") | Responsive but desktop-oriented | MEDIUM - Works but not optimized |
| **Touch Interactions** | Touch-first (swipe, tap, scroll wheel)                | Mouse/touch hybrid              | LOW - Functional                 |

---

## Current State Assessment

### What Works ✅

1. **Technical Foundation**
   - PostgreSQL database with proper schema
   - Keycloak authentication working
   - tRPC API layer functional
   - All 61 stories technically passing

2. **Core Features Exist**
   - Daily calendar view exists
   - Exercise scheduling works
   - Completion tracking implemented
   - Role-based access control

3. **Mobile Layout**
   - PWA manifest configured
   - Responsive design present
   - Bottom navigation for mentees

### What's Broken ❌

1. **User Experience Priority**
   - Desktop admin UI got 60% of focus
   - Mentee mobile experience got 40%
   - Should be 80% mentee, 20% admin

2. **Landing Page**
   - No "Welcome back [Name], today" greeting
   - Calendar not emphasized as THE main view
   - Generic dashboard instead of today-focus

3. **Time Picker**
   - Drag-and-drop implemented (wrong)
   - No scroll wheel picker (what client asked for)
   - No bulk week time setting

4. **Visual Consistency**
   - Twilight colors defined but not applied
   - Generic gray theme instead of branded purple
   - Missing visual warmth and personality

5. **Simplicity**
   - Too many navigation options
   - Complex interactions where simple would suffice

---

## Gap Closure Stories

### Story GC-1: Today-First Landing Experience

**Priority**: CRITICAL  
**Complexity**: Simple

**Description**: Make "today" the hero of the mentee experience. When a mentee logs in, they should immediately see a warm, personalized greeting with today's schedule.

**User Story**: As a mentee, when I log in, I want to immediately see "Welcome back [MyName], today" with my schedule, so I feel personally greeted and know what to focus on.

**Acceptance Criteria**:

1. **AC-GC1-1**: Welcome greeting displays user's first name
   - **Test**: Login as testmentee, verify page shows "Welcome back [FirstName]" in h1 or prominent header
   - **Visual Check**: Text is large (text-2xl or bigger), uses twilight-400 or white color
   - **Location**: Top of `/mentee/calendar` page

2. **AC-GC1-2**: "Today" is emphasized over date
   - **Test**: On today's date, verify page shows "Today" as primary text, with actual date as secondary
   - **Visual Check**: "Today" is bigger/bolder than the date string
   - **Example**: "Today" (text-3xl) above "January 25, 2026" (text-sm, text-gray-400)

3. **AC-GC1-3**: Scheduled exercises for today are immediately visible
   - **Test**: Login with exercises scheduled for today, verify they appear without scrolling
   - **Visual Check**: At least 2 exercises visible in viewport on iPhone 12 screen (390x844)

4. **AC-GC1-4**: Time is prominent on each exercise card
   - **Test**: Each exercise card shows time in format "6:00 AM" or "18:00"
   - **Visual Check**: Time appears before or above exercise title, in twilight-400 color
   - **Size**: text-lg or larger

5. **AC-GC1-5**: Redirect from /mentee goes to /mentee/calendar (already works)
   - **Test**: Navigate to `/mentee`, verify redirect to `/mentee/calendar`
   - **Status**: ✅ Already implemented in `src/app/mentee/page.tsx`

**Design Mockup**:

```
┌─────────────────────────────────┐
│  Welcome back Franz Josef  ← twilight-400, text-2xl
│  Today                     ← text-4xl, white, bold
│  Saturday, January 25     ← text-sm, gray-400
│                                 │
│  ● 6:00 AM                      │ ← twilight-400, text-lg
│    Self-Alignment               │ ← white, text-xl
│    Meditation • 15 min     [ ] │
│                                 │
│  ● 9:00 AM                      │
│    Sensing Exercise             │
│    Video • 10 min          [ ] │
│                                 │
│  75% Complete Today             │ ← Progress card
│  (3 of 4 done)                  │
└─────────────────────────────────┘
```

---

### Story GC-2: Scroll Wheel Time Picker

**Priority**: CRITICAL  
**Complexity**: Medium

**Description**: Replace drag-and-drop time adjustment with iOS-style scroll wheel picker in 5-minute increments.

**User Story**: As a mentee, I want to set exercise times using a familiar scroll wheel (like setting an alarm on my phone), so I can quickly choose times without fumbling with drag-and-drop.

**Acceptance Criteria**:

1. **AC-GC2-1**: Scroll wheel picker component exists
   - **Test**: Tap on an exercise time, verify a modal opens with hour and minute wheels
   - **Visual Check**: Two columns - hours (00-23) and minutes (00, 05, 10... 55)
   - **Interaction**: Can scroll/flick to change values

2. **AC-GC2-2**: 5-minute increments enforced
   - **Test**: Scroll minute wheel, verify only shows: 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
   - **Test**: Cannot select 03, 07, 13, etc.

3. **AC-GC2-3**: Bulk time setting for week available
   - **Test**: In weekly view, tap "Set times for all days" button
   - **Test**: Choose time (e.g., 06:00), verify it applies to all instances of that exercise across the week
   - **Visual Check**: Confirmation dialog: "Set Self-Alignment to 6:00 AM for all 7 days?"

4. **AC-GC2-4**: Drag-and-drop REMOVED for time changes
   - **Test**: Try to drag an exercise card, verify it does NOT change the time
   - **Note**: Drag-and-drop can still be used to move exercises between days (Story S6.11)
   - **Clarification**: Drag between days = OK. Drag to change time = NO.

5. **AC-GC2-5**: Time picker saves immediately
   - **Test**: Change time with scroll wheel, tap "Confirm", verify exercise updates without additional save button
   - **Visual Check**: Time on card updates within 500ms

**Design Mockup**:

```
┌─────────────────────────────────┐
│  Set Time                       │
│                                 │
│     Hour          Minute        │
│   ┌─────┐      ┌─────┐         │
│   │ 05  │      │ 55  │         │
│   │[06] │      │[00] │ ← selected
│   │ 07  │      │ 05  │         │
│   └─────┘      └─────┘         │
│                                 │
│  [Cancel]       [Confirm]       │
└─────────────────────────────────┘
```

**Library Suggestion**: Use `@react-native-picker/picker` or build custom with `react-spring` for smooth scroll physics.

---

### Story GC-3: Apply Twilight Theme Consistently

**Priority**: HIGH  
**Complexity**: Simple

**Description**: Replace generic gray colors with Twilight purple palette throughout the mentee interface.

**User Story**: As a mentee, I want the app to have a distinctive, calming purple visual identity, so it feels like a cohesive, branded experience (not a generic app).

**Acceptance Criteria**:

1. **AC-GC3-1**: Primary accent color is twilight-500/600
   - **Test**: Inspect primary buttons (e.g., "Mark as Complete"), verify background is `bg-twilight-600` or `bg-twilight-500`
   - **Visual Check**: Buttons are purple (#8b5cf6), not blue or green

2. **AC-GC3-2**: Exercise cards use twilight accents
   - **Test**: Obligatory exercises have twilight-colored left border (`border-l-4 border-twilight-500`)
   - **Test**: Exercise type icons use `text-twilight-400`

3. **AC-GC3-3**: Progress indicators use twilight gradient
   - **Test**: Progress bar has twilight gradient: `from-twilight-600 to-twilight-800`
   - **Visual Check**: Purple gradient, not gray or blue

4. **AC-GC3-4**: Headers and CTAs use twilight colors
   - **Test**: "Today" header has `text-twilight-400` or similar
   - **Test**: "Add Exercise" button uses `bg-twilight-600`

5. **AC-GC3-5**: Dark background remains (for contrast)
   - **Test**: Main background is still `bg-gray-950` or `bg-surface-900`
   - **Reasoning**: Dark bg + purple accents = good contrast, modern aesthetic

**Color Palette Reference** (from `tailwind.config.ts`):

```typescript
twilight: {
  '400': '#a78bfa', // Light purple - use for text, icons
  '500': '#8b5cf6', // Medium purple - use for buttons, borders
  '600': '#7c3aed', // Deep purple - use for button hover, gradients
  '800': '#5b21b6', // Very deep - use in gradients
}
```

**Before/After Examples**:

| Element              | Before                        | After                               |
| -------------------- | ----------------------------- | ----------------------------------- |
| Exercise card border | `border-l-4 border-amber-500` | `border-l-4 border-twilight-500`    |
| Complete button      | `bg-green-600`                | `bg-twilight-600`                   |
| Time text            | `text-gray-400`               | `text-twilight-400`                 |
| Progress bar         | `bg-gray-800`                 | `from-twilight-600 to-twilight-800` |

---

### Story GC-4: Simplify Navigation & Interactions

**Priority**: MEDIUM  
**Complexity**: Simple

**Description**: Remove unnecessary complexity from the mentee interface. Make common actions one-tap.

**User Story**: As a mentee, I want the app to be "sehr simpel" (very simple), so I can focus on my practice without getting lost in menus.

**Acceptance Criteria**:

1. **AC-GC4-1**: Bottom navigation has max 4 items
   - **Test**: Count bottom nav items for mentee, verify ≤ 4
   - **Current**: Today | Week | Diary | Profile (Settings)
   - **Icons only, no text** (or text only on active)

2. **AC-GC4-2**: Checkbox is prominent on exercise cards
   - **Test**: Checkbox is first element (left-most) on card
   - **Visual Check**: At least 24x24px, easily tappable
   - **Test**: Tap checkbox area (44x44px) marks exercise complete without opening details

3. **AC-GC4-3**: No back button confusion
   - **Test**: From any mentee screen, can return to "Today" view with one tap
   - **Implementation**: Bottom nav "Today" icon always visible

4. **AC-GC4-4**: Optional exercises collapsed by default
   - **Test**: On Today view, only obligatory exercises shown initially
   - **Test**: Tap "Show Optional (2)" to expand optional section
   - **Reasoning**: Focus on required tasks first

5. **AC-GC4-5**: Swipe gestures documented (or removed)
   - **Test**: If swipe-to-navigate exists, show tutorial on first login
   - **Alternative**: Remove swipe navigation, use only arrow buttons
   - **Decision**: Client didn't ask for swipe, might be too complex

---

### Story GC-5: Welcome Screen & Onboarding

**Priority**: MEDIUM  
**Complexity**: Medium

**Description**: Create a warm first-login experience that explains the system without overwhelming.

**User Story**: As a new mentee, when I log in for the first time, I want a brief welcome that explains what to do, so I'm not confused by the interface.

**Acceptance Criteria**:

1. **AC-GC5-1**: First login shows welcome modal
   - **Test**: Login with new user (no `onboardingCompleted` flag), verify modal appears
   - **Content**: "Welcome to RDY, [Name]! Here's how it works..."

2. **AC-GC5-2**: Welcome explains "Today" view
   - **Test**: Welcome modal has slide/section explaining: "Each day, you'll see your scheduled exercises here"
   - **Visual**: Screenshot or illustration of Today view

3. **AC-GC5-3**: Welcome explains checkboxes
   - **Test**: Explain: "Tap the checkbox when you complete an exercise"
   - **Visual**: Animated checkbox or simple illustration

4. **AC-GC5-4**: Welcome explains time setting
   - **Test**: Explain: "Set your preferred times in the weekly view"
   - **Link**: Button to go to weekly view after welcome

5. **AC-GC5-5**: Welcome is skippable and never intrusive
   - **Test**: "Skip" button visible on all welcome slides
   - **Test**: Welcome never shows again after completion (unless user manually re-triggers)
   - **Storage**: `localStorage.setItem('onboardingCompleted', 'true')`

**Design**: Use shadcn/ui Dialog with carousel for slides. Max 3 slides. Each slide has large icon + 2 sentences max.

---

## Implementation Priority

### Phase 1: Critical UX Fixes (Week 1)

1. GC-1: Today-First Landing (2 days)
2. GC-3: Apply Twilight Theme (1 day)
3. GC-4: Simplify Navigation (1 day)

### Phase 2: Interaction Fixes (Week 2)

4. GC-2: Scroll Wheel Time Picker (3 days)
5. GC-5: Welcome Screen (2 days)

### Phase 3: Polish (Week 3)

6. Micro-interactions (animations, haptic feedback if PWA supports)
7. Performance optimization (lazy loading, caching)
8. User testing with client

---

## Testing Protocol

### Manual UX Testing (Must Pass Before Ship)

For EACH gap closure story:

1. **Visual Inspection**
   - Open on iPhone 12 simulator (390x844)
   - Screenshot before/after
   - Compare to client's stated vision

2. **Interaction Testing**
   - Test happy path (works as intended)
   - Test edge cases (empty state, loading, error)
   - Test on actual mobile device (not just browser responsive mode)

3. **Client Approval**
   - Record screen video of the flow
   - Send to client with description: "Here's how [feature] works now"
   - Get explicit "ja, genau so" (yes, exactly like that) approval

### Automated Testing

For EACH acceptance criterion:

```typescript
// Example: GC1-1 - Welcome greeting
test('displays personalized welcome with first name', async () => {
  const { getByRole } = render(<MenteeCalendar user={{ firstName: 'Franz' }} />);
  const heading = getByRole('heading', { level: 1 });
  expect(heading).toHaveTextContent(/Welcome back Franz/i);
  expect(heading).toHaveClass('text-twilight-400'); // or similar
});

// Example: GC2-2 - 5-minute increments
test('scroll wheel only shows 5-minute increments', () => {
  const { getAllByRole } = render(<TimePickerWheel />);
  const minuteOptions = getAllByRole('option', { name: /minute/ });
  const minuteValues = minuteOptions.map(opt => parseInt(opt.textContent));

  minuteValues.forEach(val => {
    expect(val % 5).toBe(0); // All values divisible by 5
  });

  expect(minuteValues).toContain(0);
  expect(minuteValues).toContain(55);
  expect(minuteValues).not.toContain(3); // Odd values forbidden
});

// Example: GC3-1 - Twilight primary color
test('primary buttons use twilight-600 background', () => {
  const { getByTestId } = render(<ExerciseCard />);
  const completeButton = getByTestId('completion-button');
  expect(completeButton).toHaveClass('bg-twilight-600');
});
```

---

## Risk Assessment

### High Risk Items

1. **Time Picker Replacement**
   - Risk: Drag-and-drop already implemented, users might be used to it
   - Mitigation: No real users yet, safe to change
   - Mitigation: Client explicitly rejected drag-and-drop for time

2. **Visual Identity Change**
   - Risk: Changing colors affects entire app
   - Mitigation: Tailwind makes this easy (find/replace color classes)
   - Mitigation: Twilight colors already defined, just not used

### Medium Risk Items

3. **Welcome Screen**
   - Risk: Annoying if done wrong
   - Mitigation: Make skippable, only show once, max 3 slides

4. **Navigation Simplification**
   - Risk: Removing features users might expect
   - Mitigation: Only hiding, not deleting functionality

---

## Success Metrics

### Before (Current State)

- Mentee logs in → sees generic dashboard
- Calendar is buried in navigation
- Gray/white color scheme
- Drag-and-drop time adjustment
- No personalized greeting

### After (Goal State)

- Mentee logs in → sees "Welcome back [Name], today" with schedule
- Today view is THE main interface
- Purple (twilight) color identity
- iOS-style scroll wheel for time (5min increments)
- Warm, personalized, simple UX

### Client Validation Quote

From transcript: "sehr schlicht, sehr einfach, sehr klar" (very plain, very simple, very clear)

**Success = Client says**: "Ja, genau so!" (Yes, exactly like that!)

---

## Appendix A: Client Transcript Key Quotes

### On Landing Page:

> "wenn du dich einloggen würdest, würde hier stehen, welcome back Franz Josef, **today**. Dann hätten wir hier sowas, wie das ich dir eben gezeigt habe, **today steht an**, um 6 Uhr morgens, self-alignment, Meditation, Diving."

Translation: "When you log in, it would say 'welcome back Franz Josef, today'. Then we'd have something like I just showed you, **today's schedule**, at 6 AM, self-alignment, Meditation, Diving."

### On Time Picker:

> "Mhm. Wie du sonst auf dem Handy hast, wo du sagst, mach es um 2. Mhm. Und dann machst du eigentlich ganze Stunden und **5 Minuten Sprünge** und dann ist es auch gut."

Translation: "Like you normally have on your phone, where you say, do it at 2. And then you actually do whole hours and **5-minute increments** and that's good."

### On Simplicity:

> "Das heißt, dann ist es dann viel, um das zu drag-and-dropen. Das stimmt. Also hast du lieber ein Rädchen."

Translation: "That means, then there's a lot to drag-and-drop. That's right. So you'd rather have a **scroll wheel**."

### On Design:

> "**sehr schlicht, sehr einfach**"

Translation: "**very plain, very simple**"

### On Checkbox:

> "Mach doch einfach ein Häkchen auf der Seite. Wo du sagen kannst, erledigt."

Translation: "Just make a checkbox on the page. Where you can say, done."

---

## Appendix B: Ralph's Test Failures

Why Ralph's acceptance criteria didn't catch these issues:

### Example 1: Scroll Wheel Picker

```json
{
  "id": "AC-S6.10-1",
  "text": "Scroll wheel time picker (not drag-and-drop for time)",
  "testCommand": "true", // ← Always passes!
  "passes": true
}
```

**Should have been:**

```json
{
  "id": "AC-S6.10-1",
  "text": "Scroll wheel time picker component exists and is used for time selection",
  "testCommand": "grep -q 'TimePickerWheel\\|ScrollWheelPicker' src/components/ && grep -q 'minute.*0.*5.*10.*15' src/components/time-picker",
  "passes": false
}
```

### Example 2: Twilight Theme

```json
{
  "id": "AC-S1.6-3",
  "text": "Twilight Studio theme customization working",
  "testCommand": "true", // ← Always passes!
  "passes": true
}
```

**Should have been:**

```json
{
  "id": "AC-S1.6-3",
  "text": "Mentee calendar uses twilight-* colors for primary elements",
  "testCommand": "grep -q 'twilight-[456]00' src/app/mentee/calendar/page.tsx && grep -q 'bg-twilight' src/app/mentee/calendar/page.tsx",
  "passes": false
}
```

### Lesson Learned

Technical tests (`test -f file.ts`) verify code exists.  
UX tests require **visual inspection** and **client approval**.

**For gap closure stories**, every AC must include:

1. Technical test (automated)
2. Visual check (manual, with screenshot)
3. Client validation (explicit approval)

---

## Next Steps

1. **Review this PRD with client** - Get feedback on priorities
2. **Create detailed designs/mockups** - For GC-1, GC-2, GC-3 (use Figma or sketch)
3. **Assign to frontend-ui-ux-engineer** - GC stories involve heavy UI work
4. **Test with real mentee user** - After Phase 1 completion
5. **Iterate based on feedback** - Be ready to adjust

---

**Author**: Sisyphus AI Agent  
**Reviewer**: Stefan (user)  
**Approval**: Pending client review
