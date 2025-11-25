# API Specification: Project Structure Review

**Feature**: 008-project-structure-review
**Date**: 2025-01-27
**Purpose**: Define API contracts for project structure analysis

## Overview

This API specification defines the contracts for analyzing project structure, identifying duplications, and generating cleanup recommendations. The analysis is performed through a combination of automated tools and manual review processes.

## Base URL

```
/api/structure-analysis
```

## Authentication

No authentication required for analysis operations (read-only).

## Endpoints

### 1. Analyze Project Structure

**POST** `/api/structure-analysis/analyze`

Initiates comprehensive analysis of the project structure.

**Request Body**:
```json
{
  "directories": ["@types/", "@supabase/", "@src/", "@scripts/", "@public/", "@app/"],
  "options": {
    "includeUnusedFiles": true,
    "includeDependencies": true,
    "includePatterns": true,
    "severityThreshold": "medium"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "status": "completed",
    "summary": {
      "totalFiles": 150,
      "totalDirectories": 25,
      "duplicationsFound": 15,
      "inconsistenciesFound": 8,
      "recommendationsGenerated": 12
    },
    "duplications": [
      {
        "id": "uuid",
        "serviceName": "AuthService",
        "locations": [
          "src/lib/auth/auth-service.ts",
          "src/lib/auth/server-auth-service.ts",
          "src/lib/domain/services/AdminAuthService.ts"
        ],
        "duplicationType": "implementation",
        "overlapPercentage": 85,
        "severity": "high",
        "consolidationEffort": "medium",
        "consolidationImpact": "high"
      }
    ],
    "inconsistencies": [
      {
        "id": "uuid",
        "type": "naming",
        "description": "Inconsistent naming conventions across auth services",
        "locations": [
          "src/lib/auth/",
          "src/lib/domain/services/"
        ],
        "expectedPattern": "kebab-case",
        "actualPattern": "PascalCase",
        "impact": "medium",
        "fixEffort": "low"
      }
    ],
    "recommendations": [
      {
        "id": "uuid",
        "title": "Consolidate Authentication Services",
        "description": "Merge AuthService, ServerAuthService, and AdminAuthService into unified service",
        "type": "consolidation",
        "priority": "critical",
        "effort": "medium",
        "impact": "high",
        "files": [
          "src/lib/auth/auth-service.ts",
          "src/lib/auth/server-auth-service.ts",
          "src/lib/domain/services/AdminAuthService.ts"
        ],
        "steps": [
          "Create unified auth service interface",
          "Implement consolidated service",
          "Update all imports",
          "Remove duplicate implementations"
        ],
        "risks": [
          "Breaking changes in auth flow",
          "Potential security vulnerabilities"
        ]
      }
    ]
  }
}
```

### 2. Get Analysis Status

**GET** `/api/structure-analysis/{analysisId}/status`

Retrieves the current status of a structure analysis.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "status": "completed",
    "progress": 100,
    "startedAt": "2025-01-27T10:00:00Z",
    "completedAt": "2025-01-27T10:02:30Z",
    "estimatedTimeRemaining": 0
  }
}
```

### 3. Get Duplication Details

**GET** `/api/structure-analysis/{analysisId}/duplications/{duplicationId}`

Retrieves detailed information about a specific duplication.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "serviceName": "AuthService",
    "locations": [
      {
        "path": "src/lib/auth/auth-service.ts",
        "lines": "1-150",
        "functions": ["signIn", "signOut", "getUser"],
        "interfaces": ["AuthService", "AuthUser"]
      },
      {
        "path": "src/lib/auth/server-auth-service.ts",
        "lines": "1-120",
        "functions": ["getSession", "getUser", "verifyToken"],
        "interfaces": ["ServerAuthService", "AuthUser"]
      }
    ],
    "duplicationType": "implementation",
    "overlapPercentage": 85,
    "severity": "high",
    "consolidationEffort": "medium",
    "consolidationImpact": "high",
    "analysis": {
      "commonFunctions": ["getUser", "signOut"],
      "uniqueFunctions": ["signIn", "getSession", "verifyToken"],
      "interfaceOverlap": 90,
      "implementationOverlap": 80
    }
  }
}
```

### 4. Get Recommendation Details

**GET** `/api/structure-analysis/{analysisId}/recommendations/{recommendationId}`

Retrieves detailed information about a specific cleanup recommendation.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Consolidate Authentication Services",
    "description": "Merge AuthService, ServerAuthService, and AdminAuthService into unified service",
    "type": "consolidation",
    "priority": "critical",
    "effort": "medium",
    "impact": "high",
    "files": [
      {
        "path": "src/lib/auth/auth-service.ts",
        "action": "modify",
        "changes": ["merge with unified service", "update exports"]
      },
      {
        "path": "src/lib/auth/server-auth-service.ts",
        "action": "modify",
        "changes": ["merge with unified service", "update exports"]
      },
      {
        "path": "src/lib/domain/services/AdminAuthService.ts",
        "action": "modify",
        "changes": ["integrate admin functionality", "update exports"]
      }
    ],
    "steps": [
      "Create unified auth service interface",
      "Implement consolidated service",
      "Update all imports across codebase",
      "Remove duplicate implementations",
      "Update tests"
    ],
    "risks": [
      {
        "risk": "Breaking changes in auth flow",
        "mitigation": "Comprehensive testing and gradual migration"
      },
      {
        "risk": "Potential security vulnerabilities",
        "mitigation": "Security review and penetration testing"
      }
    ],
    "dependencies": [
      "src/components/auth/ProtectedRoute.tsx",
      "src/hooks/useAuth.ts",
      "app/api/auth/route.ts"
    ]
  }
}
```

### 5. Export Analysis Report

**GET** `/api/structure-analysis/{analysisId}/export`

Exports the complete analysis report in various formats.

**Query Parameters**:
- `format`: `json` | `csv` | `pdf` (default: `json`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "format": "json",
    "downloadUrl": "/api/structure-analysis/{analysisId}/download/report.json",
    "expiresAt": "2025-01-28T10:00:00Z"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": {
      "field": "directories",
      "issue": "Must be an array of valid directory paths"
    }
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "ANALYSIS_NOT_FOUND",
    "message": "Analysis with ID {analysisId} not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "ANALYSIS_FAILED",
    "message": "Analysis failed due to internal error",
    "details": {
      "error": "File system access denied"
    }
  }
}
```

## Data Types

### AnalysisStatus
```typescript
type AnalysisStatus = "pending" | "analyzing" | "completed" | "failed";
```

### DuplicationType
```typescript
type DuplicationType = "interface" | "implementation" | "logic" | "utility";
```

### SeverityLevel
```typescript
type SeverityLevel = "low" | "medium" | "high" | "critical";
```

### RecommendationType
```typescript
type RecommendationType = "consolidation" | "refactoring" | "cleanup" | "restructure" | "optimization";
```

### EffortLevel
```typescript
type EffortLevel = "low" | "medium" | "high";
```

## Rate Limiting

- 10 analysis requests per hour per user
- 100 status checks per hour per user
- 1000 detail requests per hour per user

## Caching

- Analysis results cached for 24 hours
- Status information cached for 5 minutes
- Detail information cached for 1 hour
