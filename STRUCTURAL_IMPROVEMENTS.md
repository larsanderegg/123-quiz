# Structural Improvements for Quiz Presentation App

## Executive Summary

This quiz presentation app displays questions on a big screen for a physical quiz game (similar to "1, 2 oder 3"). People physically stand on answer fields in the real world, and the app shows questions/answers with an 8-step reveal sequence controlled by clicking to advance slides.

**Current Pain Points (confirmed by user):**
1. Managing media files - Cloud Storage is disabled, must manually enter paths
2. Can't preview questions before presenting - no WYSIWYG
3. Hard to customize presentation style - hardcoded colors/fonts

**Priorities (confirmed by user):**
- ✅ Enable Cloud Storage for file uploads
- ✅ Add preview functionality to management interface
- ✅ Add basic theming/styling customization
- ✅ Keep LED control integration
- ✅ Keep simple fixed layout (no complex layout customization)

---

## Phase 1: Enable Cloud Storage (CRITICAL - FOUNDATION)

**Priority:** CRITICAL - All other improvements depend on this
**Effort:** 1-2 weeks
**Impact:** Removes biggest pain point, enables actual file uploads

### Implementation Steps

#### 1.1 Enable Firebase Storage Module
**File:** `src/app/app.config.ts`
- Uncomment line 6: `import { provideStorage, getStorage } from '@angular/fire/storage';`
- Uncomment line 18: `provideStorage(() => getStorage())`

#### 1.2 Restore Full Storage Service Implementation
**File:** `src/app/services/storage.service.ts`

Replace stub implementation with full Firebase Storage functionality:

**Required Methods:**
- `uploadFile(file: File, path: string): Observable<string>` - Upload file and return download URL
- `uploadBlob(blob: Blob, path: string, contentType: string): Observable<string>` - Upload blob data
- `deleteFile(path: string): Observable<void>` - Delete file from storage
- `getPathFromUrl(url: string): string | null` - Extract storage path from download URL
- `generateUniquePath(originalName: string, prefix: string): string` - Already implemented

**Implementation Pattern:**
- Use `uploadBytesResumable()` from Firebase Storage for progress tracking
- Use `getDownloadURL()` to retrieve public URLs
- Convert Promises to Observables using `from()`
- Handle errors with clear error messages

#### 1.3 Convert Round Form to Use File Uploads
**Files:**
- `src/app/components/round-form/round-form.component.ts`
- `src/app/components/round-form/round-form.component.html`

**Current State:** Uses text inputs for `audioPath` (line 50) and `backgroundImagePath` (line 51)

**Changes Needed:**

**Component (.ts):**
- Add file input properties: `audioFile: File | null`, `backgroundImageFile: File | null`
- Add preview properties: `audioPreview: string | null`, `backgroundPreview: string | ArrayBuffer | null`
- Add existing URL properties: `existingAudioUrl: string | null`, `existingBackgroundUrl: string | null`
- Implement file selection handlers:
  - `onAudioFileSelected(event: Event)` - Handle audio file selection
  - `onBackgroundFileSelected(event: Event)` - Handle image file selection
- Implement clear file methods:
  - `clearAudioFile()` - Clear selected audio
  - `clearBackgroundFile()` - Clear selected background
- Update `onSubmit()` to upload files before saving round
- Update `loadRoundData()` to load existing file URLs for preview

**Template (.html):**
- Replace text inputs with file upload buttons:
  - Audio: `<input type="file" accept="audio/*">`
  - Background: `<input type="file" accept="image/*">`
- Add preview sections showing current/selected files
- Add clear buttons for each file
- Show filename and file size for selected files

#### 1.4 Update Quiz Player to Use Cloud Storage URLs
**File:** `src/app/components/quiz-player/quiz-player.component.ts`

**Current Issue:** Line 215 references `round.backgroundImagePath` (legacy field)

**Changes:**
- Update to use `round.backgroundImageUrl` (Cloud Storage URL)
- Add fallback to `backgroundImagePath` for backward compatibility
- Update template to use full URLs instead of `/assets/images/` prefix

#### 1.5 Update Data Models (Non-Breaking)
**Files:**
- `src/app/models/round.model.ts`
- `src/app/models/question.model.ts`
- `src/app/models/answer.model.ts`

**Strategy:** Mark legacy fields as deprecated but keep them for backward compatibility

**Changes:**
- Add JSDoc `@deprecated` tags to legacy fields:
  - `audioPath`, `backgroundImagePath` in Round
  - `image`, `imageMimeType` in Question and Answer
- Document that new code should use URL fields instead
- No breaking changes to interfaces

### Critical Files
- `src/app/app.config.ts` (lines 6, 18)
- `src/app/services/storage.service.ts` (full rewrite)
- `src/app/components/round-form/round-form.component.ts` (convert to file uploads)
- `src/app/components/round-form/round-form.component.html` (update UI)
- `src/app/components/quiz-player/quiz-player.component.ts` (line 215)

### Verification
- Upload audio file in round form → verify saves to Cloud Storage and URL in Firestore
- Upload background image → verify displays in quiz player
- Upload question image → verify displays in explanation step
- Delete round/question → verify orphaned files removed from Storage
- Test file size limits (should reject > 20MB audio, > 5MB images)
- Test file type validation (should reject invalid types)

---

## Phase 2: Preview System (HIGH PRIORITY)

**Priority:** HIGH - Dramatically improves content creation UX
**Effort:** 1-2 weeks
**Impact:** Solves "can't preview before presenting" pain point

### Implementation Steps

#### 2.1 Create Shared Preview Component
**New File:** `src/app/components/shared/quiz-preview/quiz-preview.component.ts`

**Purpose:** Reusable component that mimics quiz-player display logic

**Inputs:**
- `@Input() question: Question | null` - Question to preview
- `@Input() answers: Answer[]` - Answers array
- `@Input() currentStep: number` - Current reveal step (0-7)
- `@Input() backgroundImage: string | null` - Background image URL
- `@Input() previewMode: boolean = true` - Disables interactivity

**Features:**
- Renders exactly like quiz-player but scaled down
- Shows current reveal step based on input
- No LED control integration (preview only)
- No audio playback in preview mode
- Responsive scaling to fit preview panel

**8-Step Reveal Sequence:**
- Step 0: Category header + Introduction text
- Step 1: Question text
- Step 2: Answer 1 revealed
- Step 3: Answer 2 revealed
- Step 4: Answer 3 revealed
- Step 5: Blinking animation on correct answer
- Step 6: Correct answer highlighted (green), incorrect dimmed
- Step 7: Explanation text/image displayed

#### 2.2 Create Preview Control Component
**New File:** `src/app/components/shared/preview-controls/preview-controls.component.ts`

**Purpose:** Step-through controls for navigating preview

**Features:**
- Step indicator: "Step 3 of 8: Answer 1"
- Previous/Next buttons to navigate steps
- Step labels: "Category", "Question", "Answer 1-3", "Blinking", "Correct", "Explanation"
- Visual indicator of active step

#### 2.3 Integrate Preview into Question Form
**File:** `src/app/components/question-new/question-form.component.ts`

**Changes:**
- Add preview panel to right side of form (or collapsible panel)
- Add `currentPreviewStep: number = 0` property
- Add computed properties:
  - `previewQuestion: Question` - Build Question object from form values
  - `previewAnswers: Answer[]` - Build Answer array from form
- Add `updatePreview()` method triggered on form value changes
- Use `valueChanges` observable with `debounceTime(300)` to detect form updates
- Preview updates immediately when form changes

**Layout Options:**
- **Option A (Recommended):** Side-by-side with resizable splitter
  - Form: 60-70% width, scrollable
  - Preview: 30-40% width, fixed position (sticky)
- **Option B:** Collapsible panel
  - Toggle button to show/hide preview
- **Option C:** Tab-based
  - "Edit" tab shows form, "Preview" tab shows full-screen preview

**Responsive Behavior:**
- Desktop: Side-by-side or tabs
- Mobile: Tabs only (insufficient screen space)

#### 2.4 Integrate Preview into Round Form
**File:** `src/app/components/round-form/round-form.component.ts`

**Changes:**
- Add background image preview showing how it looks in quiz player
- Add HTML5 `<audio>` element preview for uploaded audio
- Show round name as it appears on start screen
- Preview panel updates when files are selected
- Use `URL.createObjectURL()` for local file preview before upload
- Clean up object URLs on destroy: `URL.revokeObjectURL()`

### Critical Files
- NEW: `src/app/components/shared/quiz-preview/quiz-preview.component.ts`
- NEW: `src/app/components/shared/preview-controls/preview-controls.component.ts`
- `src/app/components/question-new/question-form.component.ts`
- `src/app/components/round-form/round-form.component.ts`

### Verification
- Update question text → verify preview updates immediately
- Add/remove/reorder answers → verify preview reflects changes
- Navigate through preview steps → verify correct content at each step
- Upload image in form → verify preview shows uploaded image
- Test preview on different screen sizes (responsive behavior)

---

## Phase 3: Basic Theme System (MEDIUM PRIORITY)

**Priority:** MEDIUM - Adds styling flexibility without complexity
**Effort:** 1 week
**Impact:** Solves "hard to customize presentation style" pain point

### Implementation Steps

#### 3.1 Define Theme Model
**New File:** `src/app/models/theme.model.ts`

**Interface Structure:**
```typescript
export interface QuizTheme {
  // Colors
  primaryColor?: string;          // Main text color (#RRGGBB)
  secondaryColor?: string;        // Secondary elements
  backgroundColor?: string;       // Override background color
  categoryHeaderColor?: string;   // Category text color
  questionColor?: string;         // Question text color
  answerColor?: string;           // Answer text color
  correctHighlightColor?: string; // Correct answer highlight
  incorrectDimColor?: string;     // Incorrect answer dim

  // Typography
  fontFamily?: string;            // Main font (web-safe fonts)
  categoryFontSize?: string;      // Category header size (e.g., "48px")
  questionFontSize?: string;      // Question text size
  answerFontSize?: string;        // Answer text size

  // Layout
  backgroundOpacity?: number;     // 0-1, dims background image
  answerCardOpacity?: number;     // 0-1, answer card transparency

  // Spacing
  padding?: string;               // Overall padding (e.g., "20px")
  answerSpacing?: string;         // Space between answers
}

export type ThemeInput = Partial<QuizTheme>;
```

#### 3.2 Extend Round Model with Theme
**File:** `src/app/models/round.model.ts`

**Changes:**
- Add `theme?: QuizTheme` property
- Update `RoundInput` type to include theme
- Theme is optional, falls back to default if not set

#### 3.3 Create Theme Service
**New File:** `src/app/services/theme.service.ts`

**Purpose:** Manage theme state and application

**Methods:**
- `applyTheme(theme: QuizTheme | null): void` - Apply CSS variables to document
- `getDefaultTheme(): QuizTheme` - Return default theme values
- `mergeTheme(custom: Partial<QuizTheme>): QuizTheme` - Merge with defaults
- `validateTheme(theme: Partial<QuizTheme>): boolean` - Client-side validation

**Implementation:**
- Set CSS custom properties on `:root` element
- Use `document.documentElement.style.setProperty('--var-name', value)`
- Remove properties to revert to defaults

#### 3.4 Update Quiz Player for Theme Support
**File:** `src/app/components/quiz-player/quiz-player.component.ts`

**Changes:**
- Inject `ThemeService`
- In `loadQuizData()`, apply theme from `round.theme` if present
- On component destroy, reset to default theme
- Template uses CSS variables instead of hardcoded classes

#### 3.5 Refactor Quiz Player Styles to Use CSS Variables
**File:** `src/app/components/quiz-player/quiz-player.component.scss`

**Strategy:** Replace hardcoded values with CSS variables

**Example:**
```scss
// Before
.category-header-text {
  font-family: 'Berlin Sans FB', sans-serif;
  color: #333;
  font-size: 48px;
}

// After
.category-header-text {
  font-family: var(--quiz-font-family, 'Berlin Sans FB', sans-serif);
  color: var(--quiz-category-color, #333);
  font-size: var(--quiz-category-font-size, 48px);
}
```

Apply same pattern to:
- Question text styles
- Answer card styles
- Background opacity
- Correct/incorrect answer colors

#### 3.6 Add Theme Editor to Round Form
**File:** `src/app/components/round-form/round-form.component.ts`

**Changes:**
- Add collapsible "Theme Settings (Optional)" section to form
- Add theme form group: `theme: this.fb.group({ ... })`
- Add color picker inputs for each color property (HTML5 `<input type="color">`)
- Add range sliders for opacity values (0-100%, convert to 0-1)
- Add text inputs for font sizes with validation (e.g., "24px", "2rem")
- Add font family dropdown with common web fonts
- Store theme object in round data on submit
- Show "Reset to Default" button to clear theme overrides

**Template Fields:**
- Primary color (color picker)
- Category header color (color picker)
- Question color (color picker)
- Answer color (color picker)
- Correct highlight color (color picker)
- Font family (dropdown: Arial, Helvetica, Verdana, Georgia, Times New Roman, etc.)
- Category font size (text input with validation)
- Background opacity (slider 0-100%)

#### 3.7 Preview Theme in Round Form
**Integration:** Round form preview panel shows background with applied theme

**Features:**
- Theme changes immediately reflected in preview
- Validation warnings for invalid values
- Live preview of colors, fonts, opacity

### Critical Files
- NEW: `src/app/models/theme.model.ts`
- NEW: `src/app/services/theme.service.ts`
- `src/app/models/round.model.ts`
- `src/app/components/quiz-player/quiz-player.component.ts`
- `src/app/components/quiz-player/quiz-player.component.scss`
- `src/app/components/round-form/round-form.component.ts`
- `firestore.rules` (add theme validation)

### Verification
- Set theme colors in round form → verify colors apply in quiz player
- Test theme inheritance (default → round-specific)
- Test invalid color values (should show validation error)
- Test theme persistence (reload page, theme should persist)
- Test theme reset (clear theme, should revert to defaults)

---

## Phase 4: Enhanced Round Asset Management

**Priority:** MEDIUM - Builds on Phase 1
**Effort:** 1 week
**Impact:** Improves file upload UX

### Implementation Steps

#### 4.1 File Upload Progress Indicators
**Component:** Round Form

**Implementation:**
- Use `uploadBytesResumable()` from Firebase Storage
- Track `snapshot.bytesTransferred / snapshot.totalBytes`
- Show Angular Material progress bar
- Display percentage: "Uploading... 45%"
- Disable form submission during upload

#### 4.2 Audio Preview Player
**Component:** Round Form

**Implementation:**
- Add HTML5 `<audio>` element with controls
- When audio file selected, create object URL: `URL.createObjectURL(file)`
- Show play/pause/seek controls
- Display audio duration if available
- Clean up object URLs on destroy

#### 4.3 Image Preview with Metadata
**Component:** Round Form

**Implementation:**
- Show background image preview in quiz player aspect ratio
- Display image dimensions (e.g., "1920x1080")
- Show file size (e.g., "2.3 MB")
- Warn if image too large (> 5MB) or too small (< 800px wide)

#### 4.4 Replace vs. Update Workflow
**Strategy:** Show current file with "Replace" button

**Edit Mode Flow:**
- Display current audio filename with play button
- Display current background image thumbnail
- "Replace Audio" button opens file picker
- "Replace Background" button opens file picker
- Selecting new file stages replacement (doesn't delete old until save)
- "Revert" button cancels replacement

#### 4.5 Validation and Error Handling
**Audio Files:**
- Accepted: mp3, wav, ogg, aac, m4a
- Max size: 20MB (enforced in storage.rules)
- Show error for invalid files

**Image Files:**
- Accepted: jpg, png, gif, webp
- Max size: 5MB (enforced in storage.rules)
- Show error for invalid files

**Firebase Storage Errors:**
- Quota exceeded: Show upgrade prompt
- Permission denied: Check authentication
- Network error: Implement retry mechanism

### Critical Files
- `src/app/components/round-form/round-form.component.ts`
- `src/app/components/round-form/round-form.component.html`
- `src/app/services/storage.service.ts`

### Verification
- Upload large audio file → verify progress bar shows
- Select audio file → verify preview player works
- Replace existing audio/image → verify old file deleted after save
- Test concurrent uploads (multiple files)
- Test upload error handling (network failure, quota exceeded)

---

## Phase 5: Data Model Cleanup (OPTIONAL)

**Priority:** LOW - Technical debt, can be done gradually
**Effort:** Ongoing
**Impact:** Reduces confusion, cleans codebase

### Strategy
Clean up legacy TypeORM fields organically as documents are edited (no breaking changes)

### Steps
1. Update service layer to ignore legacy fields when reading/writing
2. Remove base64 Buffer processing code from question form (lines 127-139, 152-160)
3. Remove base64 image display logic from quiz-player template
4. Add console warnings in development mode when legacy fields encountered
5. Eventually remove legacy field validation from Firestore rules (after migration)

**No immediate action required** - this happens naturally over time as content is updated.

---

## Phase 6: Media Library (OPTIONAL - FUTURE)

**Priority:** LOW - Nice to have, significant effort
**Effort:** 2-3 weeks
**Impact:** Enables file reuse, reduces duplicate uploads

### High-Level Design
- Create `media` collection in Firestore to catalog uploaded files
- Build media picker dialog to browse/select existing files
- Track file usage count (how many entities reference each file)
- Prevent deletion of files with usage count > 0
- Add `/manage/media-library` admin page to manage all media
- Integrate "Choose Existing" button into question/round forms

**Not critical for MVP** - can add after Phase 1-4 stabilize.

---

## Implementation Priority Order

### Sprint 1: Cloud Storage Foundation (1-2 weeks)
- **Phase 1.1-1.2:** Enable Storage module and restore service
- **Phase 1.3:** Convert round form to file uploads
- **Phase 1.4:** Update quiz player to use URLs
- **Phase 1.5:** Mark legacy fields as deprecated
- **Test:** Verify end-to-end file upload workflow

### Sprint 2: Preview System (1-2 weeks)
- **Phase 2.1-2.2:** Create preview components
- **Phase 2.3-2.4:** Integrate into question and round forms
- **Test:** Verify preview updates correctly

### Sprint 3: Theme System (1 week)
- **Phase 3.1-3.3:** Define theme model and service
- **Phase 3.4-3.5:** Update quiz player for theme support
- **Phase 3.6-3.7:** Add theme editor to round form with preview
- **Test:** Verify themes apply correctly

### Sprint 4: Enhanced Assets (1 week)
- **Phase 4.1-4.4:** Add progress, previews, replace workflow
- **Phase 4.5:** Validation and error handling
- **Test:** Verify smooth upload experience

### Sprint 5: Data Cleanup (Ongoing)
- **Phase 5:** Clean legacy fields gradually

### Sprint 6: Media Library (Optional, Future)
- **Phase 6:** Build media library system if needed

---

## Key Architectural Decisions

### 1. Preview Architecture
**Decision:** Shared preview component reusing quiz-player logic
**Rationale:** Ensures preview exactly matches actual quiz display, reduces code duplication
**Trade-off:** Preview component must handle both full-screen and scaled-down rendering

### 2. Theme System Scope
**Decision:** CSS custom properties for colors/fonts/spacing only (no layout changes)
**Rationale:** Avoids complex layout customization, keeps fixed 8-step reveal, maintainable
**Trade-off:** Less flexibility than full customization, but much simpler

### 3. Storage Strategy
**Decision:** Files in Cloud Storage, referenced by URL in Firestore
**Rationale:** Firestore has 1MB document limit, Storage designed for files
**Trade-off:** Requires paid Firebase plan (Blaze - pay-as-you-go)

### 4. Legacy Fields
**Decision:** Keep deprecated fields in models, clean up gradually
**Rationale:** Backward compatibility, no breaking changes, organic migration
**Trade-off:** Technical debt remains temporarily, but no data loss risk

### 5. LED Control
**Decision:** Keep LED control integration as-is
**Rationale:** User confirmed it's still needed for hardware integration
**Trade-off:** None - maintains existing functionality

---

## Dependencies

```
Phase 1: Cloud Storage (FOUNDATION)
    ↓
    ├─→ Phase 2: Preview System (uses uploaded files)
    ├─→ Phase 3: Theme System (can run parallel)
    └─→ Phase 4: Enhanced Assets (builds on Phase 1)
         ↓
    Phase 5: Data Cleanup (after stabilization)
         ↓
    Phase 6: Media Library (optional future)
```

---

## Potential Challenges

### Challenge 1: Storage Quota
**Issue:** Free tier has no Cloud Storage, paid tier required
**Solution:** Document Firebase upgrade in FIREBASE_SETUP.md, implement file size limits

### Challenge 2: Preview Performance
**Issue:** Live preview with form updates may cause lag
**Solution:** Use `debounceTime(300)`, optimize with OnPush change detection

### Challenge 3: Theme CSS Cascade
**Issue:** CSS variable cascade can be tricky with Angular component styles
**Solution:** Apply theme variables at `:root` level, thoroughly test inheritance

### Challenge 4: File Upload UX
**Issue:** Large files may take time, blocking user
**Solution:** Show clear progress, allow form interaction (disable only submit), implement retry

### Challenge 5: Preview Layout on Mobile
**Issue:** Insufficient screen space for side-by-side preview
**Solution:** Use responsive breakpoints, switch to tabs on mobile, make preview collapsible

---

## Success Metrics

### Phase 1 Success
- ✅ Can upload audio files in round form → saves to Storage, URL in Firestore
- ✅ Can upload background images → displays correctly in quiz player
- ✅ Can upload question images → shows in explanation step
- ✅ Deleting entities removes orphaned files from Storage

### Phase 2 Success
- ✅ Preview updates immediately when form changes
- ✅ Preview shows all 8 reveal steps accurately
- ✅ Preview matches actual quiz player display exactly

### Phase 3 Success
- ✅ Can set custom colors/fonts in round form
- ✅ Theme applies correctly in quiz player
- ✅ Theme persists across page reloads
- ✅ Can reset to default theme

### Phase 4 Success
- ✅ Upload progress bars show during file uploads
- ✅ Audio preview player works for selected files
- ✅ Image preview shows dimensions and file size
- ✅ Replace workflow allows changing files in edit mode

---

## Firebase Requirements

### Required Firebase Services
- ✅ Firestore (already enabled)
- ✅ Firebase Authentication (already enabled)
- ⚠️ Cloud Storage (needs enabling - requires Blaze plan upgrade)
- ✅ Firebase Hosting (already enabled)

### Firebase Plan Upgrade
**Current:** Free tier (Spark)
**Required:** Blaze plan (pay-as-you-go)
**Reason:** Cloud Storage not available on free tier
**Cost:** Pay only for usage - minimal for small quiz apps

### Setup Steps
1. Go to Firebase Console → Project Settings
2. Upgrade to Blaze plan
3. Enable Cloud Storage
4. Deploy storage rules: `firebase deploy --only storage:rules`
5. Uncomment storage provider in `app.config.ts`
6. Replace stub `storage.service.ts` with full implementation
