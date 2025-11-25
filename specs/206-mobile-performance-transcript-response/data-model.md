# Data Model: ResidencyWorks M0 Trial

**Date**: 2025-01-27
**Branch**: `006-mobile-performance-transcript-response`
**Purpose**: Define entities, relationships, and validation rules for the interview drill system

## Core Entities

### 1. User Entity

**Purpose**: Represents authenticated users with entitlement levels

```typescript
interface User {
  id: string;                    // UUID, primary key
  email: string;                 // Unique email address
  entitlement_level: "BASIC" | "PRO" | "LOCKED";
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  stripe_customer_id?: string;   // For payment tracking
}
```

**Validation Rules**:
- Email must be valid format
- Entitlement level must be one of the defined enum values
- Created_at must be before updated_at

**State Transitions**:
- `LOCKED` → `BASIC` (after successful payment)
- `BASIC` → `PRO` (after upgrade payment)
- Any level → `LOCKED` (after subscription cancellation)

### 2. Drill Session Entity

**Purpose**: Represents a single interview drill attempt

```typescript
interface DrillSession {
  id: string;                    // UUID, primary key
  user_id: string;               // Foreign key to User
  question_id: string;           // Content pack question reference
  content_pack_version: string;  // Version of content pack used
  status: "STARTED" | "SUBMITTED" | "PROCESSING" | "COMPLETED" | "FAILED";
  started_at: Date;
  submitted_at?: Date;
  completed_at?: Date;
  processing_time_ms?: number;
  metadata?: Record<string, unknown>; // Additional session data
}
```

**Validation Rules**:
- User must exist and have valid entitlement
- Question must exist in active content pack
- Status transitions must follow defined flow
- Processing time must be positive if set

**State Transitions**:
- `STARTED` → `SUBMITTED` (when user submits response)
- `SUBMITTED` → `PROCESSING` (when evaluation begins)
- `PROCESSING` → `COMPLETED` (on successful evaluation)
- `PROCESSING` → `FAILED` (on evaluation error)

### 3. Drill Response Entity

**Purpose**: Stores user's audio/text response for evaluation

```typescript
interface DrillResponse {
  id: string;                    // UUID, primary key
  session_id: string;            // Foreign key to DrillSession
  content?: string;              // Text response (optional)
  audio_url?: string;            // Audio file URL (optional)
  audio_duration_s?: number;     // Audio duration in seconds
  word_count?: number;           // Word count for text
  created_at: Date;
}
```

**Validation Rules**:
- Either content or audio_url must be provided
- Audio duration must be positive if provided
- Word count must be non-negative if provided
- Audio URL must be valid format

### 4. Evaluation Result Entity

**Purpose**: Stores the evaluation output from the scoring system

```typescript
interface EvaluationResult {
  id: string;                    // UUID, primary key
  session_id: string;            // Foreign key to DrillSession
  response_id: string;           // Foreign key to DrillResponse
  duration_s: number;            // Total response duration
  words: number;                 // Word count
  wpm: number;                   // Words per minute
  overall_score: number;         // 0-100 score
  categories: CategoryScore[];   // Array of 7 category scores
  what_changed: string[];        // Max 3 improvement suggestions
  practice_rule: string;         // Single practice recommendation
  model_used: string;            // AI model identifier
  processing_time_ms: number;    // Evaluation processing time
  created_at: Date;
}

interface CategoryScore {
  name: string;                  // Category name
  passFlag: "PASS" | "FLAG";     // Pass/fail status
  note: string;                  // Category-specific feedback
}
```

**Validation Rules**:
- Overall score must be between 0-100
- Categories array must have exactly 7 items
- What_changed array must have max 3 items
- Processing time must be positive
- All category names must be unique

### 5. Content Pack Entity

**Purpose**: Manages interview questions and evaluation criteria

```typescript
interface ContentPack {
  id: string;                    // UUID, primary key
  version: string;               // Semantic version (e.g., "1.2.0")
  name: string;                  // Human-readable name
  description?: string;          // Optional description
  schema_version: string;        // Content pack schema version
  content: ContentPackData;      // Actual content data
  metadata?: Record<string, unknown>; // Additional metadata
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  uploaded_by: string;           // User ID who uploaded
  file_size: number;             // Original file size in bytes
  checksum: string;              // SHA256 hash for integrity
  created_at: Date;
  updated_at: Date;
  activated_at?: Date;           // When pack became active
}

interface ContentPackData {
  version: string;
  metadata: {
    title: string;
    description: string;
    categories: string[];        // 7 category names
  };
  questions: Question[];
}

interface Question {
  id: string;
  category: string;              // Must match one of the 7 categories
  prompt: string;                // Question text
  expected_duration_s: number;   // Expected response duration
  evaluation_criteria: string[]; // Criteria for scoring
}
```

**Validation Rules**:
- Version must follow semantic versioning
- Categories array must have exactly 7 unique items
- All questions must reference valid categories
- File size must be positive
- Checksum must be valid SHA256 hash

### 6. Entitlement Cache Entity (Redis)

**Purpose**: Caches user entitlements for fast lookup

```typescript
interface EntitlementCache {
  user_id: string;               // Redis key
  entitlement_level: "BASIC" | "PRO" | "LOCKED";
  expires_at: number;            // Unix timestamp
  stripe_subscription_id?: string;
  last_updated: number;          // Unix timestamp
}
```

**Validation Rules**:
- TTL must be 1 hour (3600 seconds)
- Entitlement level must be valid enum value
- Expires_at must be in the future

## Relationships

### Primary Relationships

1. **User → DrillSession** (1:many)
   - One user can have multiple drill sessions
   - Cascade delete: Sessions deleted when user deleted

2. **DrillSession → DrillResponse** (1:1)
   - Each session has exactly one response
   - Response deleted when session deleted

3. **DrillSession → EvaluationResult** (1:1)
   - Each session has exactly one evaluation result
   - Result deleted when session deleted

4. **ContentPack → Question** (1:many)
   - One content pack contains multiple questions
   - Questions deleted when content pack deleted

### Secondary Relationships

1. **User → ContentPack** (1:many, via uploaded_by)
   - Users can upload multiple content packs
   - Soft delete: Content packs archived, not deleted

2. **DrillSession → ContentPack** (many:1, via question_id)
   - Sessions reference questions from content packs
   - Foreign key constraint ensures referential integrity

## Database Schema (Supabase)

### Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  entitlement_level TEXT NOT NULL DEFAULT 'LOCKED'
    CHECK (entitlement_level IN ('BASIC', 'PRO', 'LOCKED')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Content packs table
CREATE TABLE content_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  content JSONB NOT NULL,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  checksum TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(version, name)
);

-- Drill sessions table
CREATE TABLE drill_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  question_id TEXT NOT NULL,
  content_pack_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'STARTED'
    CHECK (status IN ('STARTED', 'SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER CHECK (processing_time_ms > 0),
  metadata JSONB
);

-- Drill responses table
CREATE TABLE drill_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES drill_sessions(id) ON DELETE CASCADE,
  content TEXT,
  audio_url TEXT,
  audio_duration_s DECIMAL CHECK (audio_duration_s > 0),
  word_count INTEGER CHECK (word_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (content IS NOT NULL OR audio_url IS NOT NULL)
);

-- Evaluation results table
CREATE TABLE evaluation_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES drill_sessions(id) ON DELETE CASCADE,
  response_id UUID REFERENCES drill_responses(id) ON DELETE CASCADE,
  duration_s DECIMAL NOT NULL CHECK (duration_s > 0),
  words INTEGER NOT NULL CHECK (words >= 0),
  wpm DECIMAL NOT NULL CHECK (wpm >= 0),
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  categories JSONB NOT NULL,
  what_changed JSONB NOT NULL,
  practice_rule TEXT NOT NULL,
  model_used TEXT NOT NULL,
  processing_time_ms INTEGER NOT NULL CHECK (processing_time_ms > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_entitlement ON users(entitlement_level);
CREATE INDEX idx_content_packs_status ON content_packs(status);
CREATE INDEX idx_content_packs_version ON content_packs(version);
CREATE INDEX idx_drill_sessions_user_id ON drill_sessions(user_id);
CREATE INDEX idx_drill_sessions_status ON drill_sessions(status);
CREATE INDEX idx_drill_sessions_started_at ON drill_sessions(started_at);
CREATE INDEX idx_evaluation_results_session_id ON evaluation_results(session_id);
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Drill sessions are private to users
CREATE POLICY "Users can access own drill sessions" ON drill_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Responses are private to users
CREATE POLICY "Users can access own responses" ON drill_responses
  FOR ALL USING (auth.uid() = (SELECT user_id FROM drill_sessions WHERE id = session_id));

-- Evaluation results are private to users
CREATE POLICY "Users can access own evaluation results" ON evaluation_results
  FOR ALL USING (auth.uid() = (SELECT user_id FROM drill_sessions WHERE id = session_id));

-- Content packs are readable by all authenticated users
CREATE POLICY "Authenticated users can read content packs" ON content_packs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only PRO users can manage content packs
CREATE POLICY "PRO users can manage content packs" ON content_packs
  FOR ALL USING (
    auth.uid() = uploaded_by AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND entitlement_level = 'PRO')
  );
```

## Validation Rules Summary

### Business Rules

1. **Entitlement Access**: Users with `LOCKED` entitlement cannot access drill features
2. **Content Pack Activation**: Only one content pack can be active at a time
3. **Session Lifecycle**: Drill sessions must follow defined status transitions
4. **Response Validation**: Either text or audio response must be provided
5. **Evaluation Completeness**: All 7 categories must be scored
6. **Performance Targets**: Processing times must meet defined thresholds

### Data Integrity Rules

1. **Referential Integrity**: All foreign keys must reference existing records
2. **Unique Constraints**: Email addresses, content pack versions must be unique
3. **Check Constraints**: Numeric fields must be within valid ranges
4. **Required Fields**: All non-nullable fields must have values
5. **Format Validation**: URLs, emails, and other formatted fields must be valid

### Security Rules

1. **Row Level Security**: Users can only access their own data
2. **Admin Access**: Only PRO users can manage content packs
3. **Authentication**: All operations require valid authentication
4. **Authorization**: Entitlement levels control feature access
5. **Data Encryption**: Sensitive data encrypted at rest and in transit
