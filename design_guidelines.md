# Design Guidelines: AI Agent Platform for Influencers & Businesses

## Design Approach

**Selected Approach:** Design System with Modern SaaS Aesthetic

**Inspiration:** Linear, Notion, Vercel - Clean, minimal interfaces that prioritize clarity and elegant interactions

**Core Principles:**
- Clarity over decoration
- Purposeful whitespace
- Subtle depth through borders and shadows
- Type-driven hierarchy
- Restrained color palette

---

## Color Palette

### Dark Mode (Primary)
- **Background:** 0 0% 9% (deep charcoal)
- **Surface:** 0 0% 12% (elevated panels)
- **Border:** 0 0% 18% (subtle dividers)
- **Text Primary:** 0 0% 95%
- **Text Secondary:** 0 0% 65%
- **Brand Primary:** 270 70% 65% (soft purple - trust, creativity)
- **Brand Hover:** 270 70% 70%
- **Success:** 142 70% 50%
- **Error:** 0 72% 55%

### Light Mode (Secondary)
- **Background:** 0 0% 98%
- **Surface:** 0 0% 100%
- **Border:** 0 0% 88%
- **Text Primary:** 0 0% 10%
- **Text Secondary:** 0 0% 45%
- **Brand colors remain consistent**

---

## Typography

**Font Stack:** Inter (Google Fonts) via CDN for entire application

**Hierarchy:**
- **Display/Hero:** 2.5rem (40px), font-weight: 700, letter-spacing: -0.02em
- **H1:** 2rem (32px), font-weight: 600
- **H2:** 1.5rem (24px), font-weight: 600
- **H3:** 1.25rem (20px), font-weight: 600
- **Body Large:** 1rem (16px), font-weight: 400, line-height: 1.6
- **Body:** 0.875rem (14px), font-weight: 400, line-height: 1.5
- **Small/Caption:** 0.75rem (12px), font-weight: 500, line-height: 1.4

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24

**Grid System:**
- Desktop content max-width: max-w-6xl
- Form containers: max-w-md (448px) for login/auth, max-w-2xl for multi-section forms
- Consistent padding: px-4 (mobile), px-6 (tablet), px-8 (desktop)
- Vertical rhythm: space-y-6 for form fields, space-y-8 for sections

**Breakpoints:**
- Mobile-first approach
- md: 768px (tablets)
- lg: 1024px (desktop)

---

## Component Library

### Authentication Pages (Google Login)
- **Layout:** Centered card on neutral background
- **Card:** max-w-md, rounded-xl, border, p-8, subtle shadow
- **Logo/Branding:** Top center, mb-8
- **Heading:** H1, centered, mb-2
- **Subtext:** Text secondary, centered, mb-8
- **Google Button:** Full width, h-12, rounded-lg, border, flex items-center justify-center, gap-3, hover state with subtle lift
- **Divider:** "or" with horizontal lines, my-6
- **Footer Links:** Text center, text-sm, text-secondary

### Forms (Business Inquiry, Influencer Preferences)
- **Labels:** text-sm, font-medium, mb-2
- **Inputs:** h-12, rounded-lg, border, px-4, focus:ring-2 ring-brand/20
- **Textareas:** min-h-32, rounded-lg, border, p-4
- **Select Dropdowns:** Same styling as inputs, chevron-down icon
- **File Upload:** Dashed border, rounded-lg, p-6, centered content, drag-and-drop affordance
- **Buttons Primary:** bg-brand, text-white, h-12, px-6, rounded-lg, font-medium, hover:bg-brand-hover
- **Buttons Secondary:** border, h-12, px-6, rounded-lg, hover:bg-surface

### Navigation
- **Top Nav:** Sticky, h-16, border-bottom, flex justify-between items-center, px-6
- **Logo:** Left aligned
- **Nav Items:** Horizontal list, text-sm, font-medium, gap-6
- **User Menu:** Right aligned, avatar + dropdown

### Cards & Panels
- **Standard Card:** rounded-xl, border, p-6, bg-surface
- **Inquiry Card:** Same as standard, hover:border-brand transition
- **Stats/Metrics:** Smaller cards, p-4, rounded-lg

### Data Display
- **Lists:** Divide-y, py-4 per item
- **Tables:** Clean borders, stripe every other row subtly, hover:bg-surface
- **Badges:** Inline-flex, px-2.5, py-0.5, rounded-full, text-xs, font-medium

---

## Animations

**Minimal & Purposeful:**
- Button hover: subtle scale and brightness (duration-150)
- Modal/Dialog: fade-in with slight scale-up (duration-200)
- Page transitions: fade (duration-100)
- Form validation: shake on error (duration-300)
- Loading states: spinner or skeleton screens (no heavy animations)

**NO:** Parallax, scroll-triggered animations, elaborate transitions

---

## Images

**Google Login Page:**
- **NO hero image** - Clean, focused authentication experience
- **Google Logo Icon:** Use official Google "G" icon from Font Awesome or similar
- **Platform Logo:** Simple wordmark or icon (can be illustrated later)

**Dashboard/Portal Pages:**
- **Empty States:** Simple illustrations for "No inquiries yet"
- **Avatars:** Circular, 40px standard, 32px small
- **Profile Headers:** Optional subtle background pattern or gradient

**General:**
- Use CDN-hosted icons (Heroicons recommended for this project)
- Avoid decorative imagery that doesn't serve function
- Profile photos and logos only where necessary

---

## Platform-Specific Notes

### Influencer Portal
- Emphasize control and customization (preferences, settings)
- Use success states for approved inquiries
- Dashboard should feel like a command center

### Business Portal
- Streamlined submission flow
- Clear pricing and offer fields
- Professional, trustworthy aesthetic
- Confirmation states after submission

### Accessibility
- Maintain consistent dark mode across all inputs
- Ensure 4.5:1 contrast ratios minimum
- Focus states visible on all interactive elements
- Keyboard navigation support throughout