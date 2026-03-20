# TuitionHub Pro - Product Specification

## 1. Vision & Goals

**Vision:** Transform TuitionHub into a world-class EdTech platform that empowers educators and students with a seamless, engaging, and professional learning experience.

**Goals:**
- 99.9% uptime reliability
- Mobile-first responsive design
- Offline-capable Progressive Web App
- Engaging gamification elements
- Comprehensive analytics for data-driven decisions

---

## 2. Feature Roadmap

### Phase 1: Foundation (MVP)
- [x] User authentication (mobile + PIN)
- [x] Student dashboard
- [x] Admin panel
- [x] Materials management
- [x] Payment slip uploads
- [x] Schedule management
- [x] Basic announcements

### Phase 2: Engagement
- [ ] Quiz system with scoring
- [ ] Discussion forums
- [ ] Progress tracking
- [ ] Achievement badges
- [ ] Push notifications

### Phase 3: Professional
- [ ] Certificate generation
- [ ] Live class integration (Zoom/Meet)
- [ ] Email automation
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

### Phase 4: Enterprise
- [ ] Multi-tenancy
- [ ] White-labeling
- [ ] API access
- [ ] Payment gateway integration
- [ ] Custom branding

---

## 3. UI/UX Design System

### Color Palette
```
Primary:     #000000 (Black)
Secondary:   #404040 (Dark Gray)
Accent:      #171717 (Near Black)
Background:  #FAFAFA (Off White)
Surface:     #FFFFFF (White)
Text:        #1A1A1A (Near Black)
TextMuted:   #6B7280 (Gray)
Border:      #E5E7EB (Light Gray)
Success:     #22C55E (Green)
Warning:     #EAB308 (Yellow)
Error:       #EF4444 (Red)
```

### Typography
```
Font Family: Inter
Headings:
  H1: 48px/56px, Bold (700)
  H2: 36px/44px, Semibold (600)
  H3: 24px/32px, Semibold (600)
  H4: 20px/28px, Medium (500)
Body:
  Large: 18px/28px, Regular (400)
  Base: 16px/24px, Regular (400)
  Small: 14px/20px, Regular (400)
  Caption: 12px/16px, Medium (500)
```

### Spacing System (8px base)
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### Border Radius
```
sm: 4px
md: 8px
lg: 12px
xl: 16px
2xl: 24px
full: 9999px
```

### Shadows
```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.07)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.15)
```

### Motion Principles
```
Duration:
  fast: 150ms
  base: 200ms
  slow: 300ms
  slower: 500ms
  
Easing:
  ease-out: cubic-bezier(0.16, 1, 0.3, 1)
  ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
  bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

---

## 4. Component Library

### Buttons
- Primary: Black bg, white text, hover:scale-[1.02]
- Secondary: White bg, black border, hover:bg-gray-50
- Ghost: Transparent, hover:bg-gray-100
- Sizes: sm(32px), md(40px), lg(48px)

### Cards
- Background: White
- Border: 1px solid #E5E7EB
- Border Radius: 12px
- Padding: 24px
- Shadow: sm (hover:md)

### Inputs
- Height: 48px
- Border: 1px solid #E5E7EB
- Border Radius: 8px
- Focus: ring-2 ring-black/10

### Navigation
- Sidebar width: 280px
- Collapsible on mobile
- Active indicator: 3px left border

### Tables
- Striped rows option
- Hover state: bg-gray-50
- Pagination at bottom

### Modals
- Backdrop: bg-black/50
- Animation: scale 0.95 → 1, opacity 0 → 1
- Max width: 480px (sm), 640px (md), 800px (lg)

### Toast Notifications
- Position: bottom-right
- Duration: 5000ms
- Types: success, error, warning, info

---

## 5. Page Templates

### Login Page
- Full-screen gradient background
- Centered glass-morphism card
- Social proof text
- Loading state on submit

### Dashboard (Student)
- Welcome banner with progress
- Quick stats grid
- Recent activity feed
- Upcoming schedule
- Achievement showcase

### Dashboard (Admin)
- Key metrics cards
- Revenue chart
- User growth chart
- Pending approvals list
- Recent activity

### Schedule Page
- Weekly calendar view
- Day/Week/Month toggle
- Color-coded subjects
- Quick join buttons

### Materials Page
- Grid/List view toggle
- Category filters
- Search bar
- Download counter

### Quiz Page
- Timer display
- Question progress bar
- Answer options (A/B/C/D)
- Submit confirmation

### Forum Page
- Thread list with avatars
- Category tags
- Sort by: Recent/Popular
- New thread button

---

## 6. Database Schema (Extended)

### New Tables

```sql
-- Quizzes
CREATE TABLE quizzes (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    passing_score INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id),
    student_id UUID REFERENCES users(id),
    answers JSONB,
    score INTEGER,
    status TEXT DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    criteria JSONB,
    points INTEGER DEFAULT 10
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    achievement_id UUID REFERENCES achievements(id),
    earned_at TIMESTAMP DEFAULT NOW()
);

-- Progress Tracking
CREATE TABLE progress (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    category TEXT,
    item_id UUID,
    progress_percent INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Forum
CREATE TABLE forum_categories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT
);

CREATE TABLE forum_posts (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES forum_categories(id),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE forum_replies (
    id UUID PRIMARY KEY,
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Certificates
CREATE TABLE certificates (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    issued_at TIMESTAMP DEFAULT NOW(),
    certificate_url TEXT,
    verification_code TEXT UNIQUE
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activity Log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. API Endpoints

### Authentication
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh

### Users
- GET /users
- POST /users
- PUT /users/:id
- DELETE /users/:id
- GET /users/:id/profile
- PUT /users/:id/settings

### Materials
- GET /materials
- POST /materials
- PUT /materials/:id
- DELETE /materials/:id

### Quizzes
- GET /quizzes
- POST /quizzes
- GET /quizzes/:id
- POST /quizzes/:id/attempt
- PUT /quizzes/:id/attempt/:attemptId

### Achievements
- GET /achievements
- GET /users/:id/achievements
- POST /users/:id/achievements/unlock

### Forum
- GET /forum/categories
- GET /forum/posts
- POST /forum/posts
- POST /forum/posts/:id/replies

### Analytics
- GET /analytics/overview
- GET /analytics/users
- GET /analytics/engagement

---

## 8. Security Requirements

### Authentication
- Rate limiting: 5 attempts per minute
- Session timeout: 24 hours
- PIN: 4-6 digits (upgradeable to OTP)
- Optional 2FA via email

### Data Protection
- All data encrypted at rest
- HTTPS only
- CORS configured
- Input sanitization
- SQL injection prevention

### Privacy
- GDPR compliant
- Data export option
- Account deletion
- Privacy policy

---

## 9. Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90
- Core Web Vitals: Pass

---

## 10. Testing Strategy

### Unit Tests
- Components
- Utilities
- API handlers

### Integration Tests
- User flows
- Data persistence

### E2E Tests
- Critical paths
- Login flow
- Quiz submission
- Payment flow

---

## 11. Deployment

### Environments
- Development: Local
- Staging: Vercel/Netlify preview
- Production: Vercel/Netlify

### CI/CD
- GitHub Actions
- Auto-deploy on merge
- Rollback capability

---

## 12. Support

### Documentation
- User guides
- Admin manual
- API docs
- Video tutorials

### Help
- In-app chat
- Email support
- Knowledge base
- FAQ section
