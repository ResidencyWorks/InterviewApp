# Tasks: Content Pack Loader

**Feature**: Content Pack Loader
**Branch**: `002-content-pack-loader`
**Date**: 2025-01-27
**Generated**: From spec.md, plan.md, data-model.md, research.md

## Summary

**Total Tasks**: 42 (5 foundational tasks already completed)
**User Stories**: 3 (P1: 2 stories, P2: 1 story)
**Parallel Opportunities**: 15 tasks identified
**MVP Scope**: User Story 1 (Upload and Validate Content Pack)

## User Story Mapping

- **User Story 1 (P1)**: Upload and Validate Content Pack - 18 tasks
- **User Story 2 (P1)**: Hot-Swap Content Pack - 16 tasks
- **User Story 3 (P2)**: Handle Fallback Content - 8 tasks
- **Setup & Foundational**: 5 tasks ✅ **COMPLETED**

## Dependencies

**Story Completion Order**:
1. **Phase 1**: Setup (T001-T002) ✅ **COMPLETED**
2. **Phase 2**: Foundational (T003-T005) ✅ **COMPLETED**
3. **Phase 3**: User Story 1 (T006-T023) - **MVP** 🎯 **READY TO START**
4. **Phase 4**: User Story 2 (T024-T039) - Depends on US1
5. **Phase 5**: User Story 3 (T040-T047) - Depends on US1
6. **Phase 6**: Polish & Cross-cutting (T048-T050)

**Independent Stories**: US1 can be implemented and tested independently. US2 and US3 depend on US1 completion.

## Implementation Strategy

**MVP First**: Implement User Story 1 for core upload and validation functionality
**Incremental Delivery**: Each user story is independently deployable and testable
**Parallel Execution**: 15 tasks can be executed in parallel within their respective phases

---

## Phase 1: Setup ✅ **COMPLETED**

### Project Initialization

- [x] T001 Create project structure per implementation plan in src/ ✅ **COMPLETED**
- [x] T002 Configure devcontainer with content pack loader tools in .devcontainer/devcontainer.json ✅ **COMPLETED**

---

## Phase 2: Foundational ✅ **COMPLETED**

### Core Infrastructure

- [x] T003 [P] Create domain interfaces in src/lib/domain/interfaces/ ✅ **COMPLETED** (implemented in src/lib/services/)
- [x] T004 [P] Setup Supabase client configuration in src/lib/supabase/client.ts ✅ **COMPLETED**
- [x] T005 [P] Setup Sentry error tracking configuration in src/lib/sentry/client.ts ✅ **COMPLETED** (implemented in src/lib/error-monitoring.ts)

---

## Phase 3: User Story 1 - Upload and Validate Content Pack (P1)

**Goal**: Admin users can upload content pack JSON files and have them validated before activation
**Independent Test**: Upload various JSON files (valid/invalid) and verify validation behavior
**Acceptance Criteria**: Drag-and-drop UI, Zod validation, descriptive error messages, dry-run validation

### Domain Layer

- [x] T006 [US1] Create ContentPack entity in src/lib/domain/entities/ContentPack.ts ✅ **COMPLETED**
- [x] T007 [US1] Create ValidationResult entity in src/lib/domain/entities/ValidationResult.ts ✅ **COMPLETED**
- [x] T008 [US1] Create ContentPackSchema entity in src/lib/domain/entities/ContentPackSchema.ts ✅ **COMPLETED**
- [x] T009 [US1] Create IContentPackRepository interface in src/lib/domain/repositories/IContentPackRepository.ts ✅ **COMPLETED**
- [x] T010 [US1] Create IContentPackValidator interface in src/lib/domain/interfaces/IContentPackValidator.ts ✅ **COMPLETED**

### Validation Layer

- [x] T011 [P] [US1] Create Zod schemas for content pack validation in src/lib/validation/schemas/ContentPackSchema.ts ✅ **COMPLETED**
- [x] T012 [US1] Implement ContentPackValidator service in src/lib/domain/services/ContentPackValidator.ts ✅ **COMPLETED**

### Infrastructure Layer

- [x] T013 [P] [US1] Implement SupabaseContentPackRepository in src/lib/infrastructure/supabase/ContentPackRepository.ts ✅ **COMPLETED**
- [x] T014 [P] [US1] Create file system fallback repository in src/lib/infrastructure/filesystem/ContentPackRepository.ts ✅ **COMPLETED**

### API Layer

- [x] T015 [US1] Create content pack upload API route in src/app/api/content-packs/route.ts ✅ **COMPLETED**
- [x] T016 [US1] Create content pack validation API route in src/app/api/content-packs/[id]/validate/route.ts ✅ **COMPLETED**
- [x] T017 [US1] Create upload queue API route in src/app/api/uploads/route.ts ✅ **COMPLETED**

### UI Components

- [x] T018 [P] [US1] Create ContentPackUpload component in src/components/content-pack/ContentPackUpload.tsx ✅ **COMPLETED**
- [x] T019 [P] [US1] Create ValidationResults component in src/components/content-pack/ValidationResults.tsx ✅ **COMPLETED**
- [x] T020 [P] [US1] Create UploadProgress component in src/components/content-pack/UploadProgress.tsx ✅ **COMPLETED**

### Admin UI

- [x] T021 [US1] Create admin content pack page in src/app/admin/content-packs/page.tsx ✅ **COMPLETED**
- [x] T022 [US1] Create admin dashboard in src/app/admin/page.tsx ✅ **COMPLETED**

### Database Schema

- [x] T023 [US1] Create Supabase database schema in migrations/001_content_packs.sql ✅ **COMPLETED**

---

## Phase 4: User Story 2 - Hot-Swap Content Pack (P1)

**Goal**: Admin users can activate validated content packs without redeploying the application
**Independent Test**: Validate and activate content pack, verify new content is immediately available
**Acceptance Criteria**: Hot-swap in memory, PostHog logging, evaluation system integration, clean replacement

### Domain Layer

- [ ] T024 [US2] Create LoadEvent entity in src/lib/domain/entities/LoadEvent.ts
- [ ] T025 [US2] Create UploadQueue entity in src/lib/domain/entities/UploadQueue.ts
- [ ] T026 [US2] Create IAnalyticsService interface in src/lib/domain/interfaces/IAnalyticsService.ts
- [ ] T027 [US2] Create IContentPackService interface in src/lib/domain/interfaces/IContentPackService.ts

### Services Layer

- [ ] T028 [US2] Implement ContentPackService in src/lib/domain/services/ContentPackService.ts
- [ ] T029 [P] [US2] Implement PostHogAnalyticsService in src/lib/infrastructure/posthog/AnalyticsService.ts
- [ ] T030 [US2] Implement UploadQueueService in src/lib/domain/services/UploadQueueService.ts

### Infrastructure Layer

- [ ] T031 [P] [US2] Setup PostHog client configuration in src/lib/posthog/client.ts
- [ ] T032 [US2] Create in-memory content pack cache in src/lib/infrastructure/cache/ContentPackCache.ts

### API Layer

- [ ] T033 [US2] Create content pack activation API route in src/app/api/content-packs/[id]/activate/route.ts
- [ ] T034 [US2] Create active content pack API route in src/app/api/content-packs/active/route.ts

### UI Components

- [ ] T035 [P] [US2] Create ContentPackActivation component in src/components/content-pack/ContentPackActivation.tsx
- [ ] T036 [P] [US2] Create ContentPackList component in src/components/content-pack/ContentPackList.tsx

### Admin UI

- [ ] T037 [US2] Update admin content pack page with activation features in src/app/admin/content-packs/page.tsx

### Database Schema

- [ ] T038 [US2] Create validation results table in migrations/002_validation_results.sql
- [ ] T039 [US2] Create upload queue table in migrations/003_upload_queue.sql

---

## Phase 5: User Story 3 - Handle Fallback Content (P2)

**Goal**: Admin users see warnings when no valid content pack is loaded
**Independent Test**: Start system without content pack and verify fallback warning is displayed
**Acceptance Criteria**: Fallback warning UI, startup fallback, warning dismissal

### Domain Layer

- [ ] T040 [US3] Create FallbackContentService in src/lib/domain/services/FallbackContentService.ts

### Infrastructure Layer

- [ ] T041 [US3] Create default content pack loader in src/lib/infrastructure/default/DefaultContentPack.ts

### UI Components

- [ ] T042 [P] [US3] Create FallbackWarning component in src/components/content-pack/FallbackWarning.tsx
- [ ] T043 [P] [US3] Create SystemStatus component in src/components/admin/SystemStatus.tsx

### Admin UI

- [ ] T044 [US3] Add fallback warning to admin dashboard in src/app/admin/page.tsx

### Application Integration

- [ ] T045 [US3] Create content pack loader middleware in src/middleware.ts
- [ ] T046 [US3] Create application startup content pack loader in src/lib/startup/ContentPackLoader.ts

### Database Schema

- [ ] T047 [US3] Create system status table in migrations/004_system_status.sql

---

## Phase 6: Polish & Cross-Cutting Concerns

### Security & Auth

- [ ] T048 [P] Implement auth middleware for admin routes in src/middleware.ts
- [ ] T049 [P] Create admin role verification service in src/lib/domain/services/AdminAuthService.ts

### Error Handling & Monitoring

- [ ] T050 [P] Setup comprehensive error tracking with Sentry integration in src/lib/error/ErrorHandler.ts

---

## Parallel Execution Examples

### Phase 3 (User Story 1) - Parallel Tasks
```
T011, T013, T014, T018, T019, T020 can run in parallel
- T011: Create Zod schemas (validation layer)
- T013: Implement Supabase repository (infrastructure)
- T014: Create file system fallback (infrastructure)
- T018: Create upload component (UI)
- T019: Create validation results component (UI)
- T020: Create upload progress component (UI)
```

### Phase 4 (User Story 2) - Parallel Tasks
```
T029, T031, T035, T036 can run in parallel
- T029: Implement PostHog analytics service (infrastructure)
- T031: Setup PostHog client (infrastructure)
- T035: Create activation component (UI)
- T036: Create content pack list component (UI)
```

### Phase 5 (User Story 3) - Parallel Tasks
```
T042, T043 can run in parallel
- T042: Create fallback warning component (UI)
- T043: Create system status component (UI)
```

### Phase 6 (Polish) - Parallel Tasks
```
T048, T049, T050 can run in parallel
- T048: Implement auth middleware (security)
- T049: Create admin auth service (security)
- T050: Setup error tracking (monitoring)
```

---

## Independent Test Criteria

### User Story 1 - Upload and Validate Content Pack
- **Test**: Upload valid JSON file → validation succeeds → confirmation prompt shown
- **Test**: Upload invalid JSON file → validation fails → descriptive error messages shown
- **Test**: Upload non-JSON file → format error message shown
- **Test**: Upload oversized file → size limit error shown

### User Story 2 - Hot-Swap Content Pack
- **Test**: Activate validated content pack → hot-swap succeeds → PostHog event logged
- **Test**: Activate new pack → previous pack archived → evaluation system uses new content
- **Test**: Activation fails → rollback occurs → system remains stable

### User Story 3 - Handle Fallback Content
- **Test**: Start system without content pack → fallback warning displayed
- **Test**: Load content pack → warning disappears
- **Test**: Content pack fails to load → fallback to default content → warning shown

---

## MVP Scope Recommendation

**Implement User Story 1 Only** for initial MVP:
- Core upload and validation functionality
- Admin UI for content pack management
- Database schema and API endpoints
- Comprehensive error handling

**Benefits**:
- Delivers immediate value (content pack validation)
- Independently testable and deployable
- Provides foundation for subsequent stories
- Reduces initial complexity and risk

**Estimated Effort**: 18 tasks, ~2-3 weeks with parallel execution

---

## ✅ **FOUNDATIONAL INFRASTRUCTURE COMPLETED**

The following foundational components are already implemented and ready for use:

### **Project Structure** ✅
- Complete `src/` directory structure with proper organization
- All necessary directories: `components/`, `hooks/`, `lib/`, `types/`, etc.

### **Devcontainer Configuration** ✅
- TypeScript Node.js environment with all required extensions
- Biome, Prisma, PostHog, Supabase, lefthook, pnpm configured
- Proper development environment setup

### **Supabase Integration** ✅
- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`
- Middleware: `src/lib/supabase/middleware.ts`

### **Error Monitoring & Sentry** ✅
- Comprehensive error monitoring: `src/lib/error-monitoring.ts`
- Component-specific error handlers
- Performance monitoring and analytics integration
- User context management

### **PostHog Analytics** ✅
- Node.js client: `src/lib/posthog.ts`
- Analytics service: `src/lib/analytics.ts`

### **Content Pack Validation** ✅
- Advanced validation service: `src/lib/services/content-pack-validation.ts`
- Performance monitoring with ≤1s target
- Comprehensive validation options and error handling

### **Additional Infrastructure** ✅
- Database utilities: `src/lib/db/`
- Security utilities: `src/lib/security/`
- Monitoring and performance tracking
- Redis integration: `src/lib/redis.ts`

**Ready to proceed with User Story 1 implementation!** 🚀
