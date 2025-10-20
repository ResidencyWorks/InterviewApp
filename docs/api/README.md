# API Documentation

This directory contains API documentation for the InterviewApp project.

## Overview

The InterviewApp API is built with Next.js API routes and provides endpoints for:

- User authentication and management
- Interview preparation features
- AI-powered feedback and analysis
- Content management
- Analytics and reporting

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.vercel.app/api`

## Authentication

Most API endpoints require authentication. Include the session token in requests:

```bash
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     https://your-domain.vercel.app/api/endpoint
```

## API Endpoints

### Authentication

#### POST /api/auth/signin

Sign in a user.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "jwt-token"
}
```

#### POST /api/auth/signup

Register a new user.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "jwt-token"
}
```

#### POST /api/auth/signout

Sign out the current user.

**Response**:
```json
{
  "message": "Signed out successfully"
}
```

### User Management

#### GET /api/user/profile

Get current user profile.

**Response**:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### PUT /api/user/profile

Update user profile.

**Request Body**:
```json
{
  "name": "Updated Name",
  "preferences": {
    "notifications": true,
    "theme": "dark"
  }
}
```

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Updated Name",
    "preferences": {
      "notifications": true,
      "theme": "dark"
    }
  }
}
```

### Interview Preparation

#### GET /api/interviews

Get user's interviews.

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (draft, completed, archived)

**Response**:
```json
{
  "interviews": [
    {
      "id": "interview-id",
      "title": "Software Engineer Interview",
      "status": "draft",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

#### POST /api/interviews

Create a new interview.

**Request Body**:
```json
{
  "title": "Software Engineer Interview",
  "description": "Technical interview for senior position",
  "questions": [
    {
      "question": "What is your experience with React?",
      "type": "technical"
    }
  ]
}
```

**Response**:
```json
{
  "interview": {
    "id": "interview-id",
    "title": "Software Engineer Interview",
    "description": "Technical interview for senior position",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/interviews/[id]

Get specific interview.

**Response**:
```json
{
  "interview": {
    "id": "interview-id",
    "title": "Software Engineer Interview",
    "description": "Technical interview for senior position",
    "status": "draft",
    "questions": [
      {
        "id": "question-id",
        "question": "What is your experience with React?",
        "type": "technical",
        "answer": "I have 5 years of experience..."
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### AI Features

#### POST /api/ai/analyze

Analyze interview responses using AI.

**Request Body**:
```json
{
  "interviewId": "interview-id",
  "responses": [
    {
      "questionId": "question-id",
      "answer": "User's answer here"
    }
  ]
}
```

**Response**:
```json
{
  "analysis": {
    "overallScore": 85,
    "feedback": [
      {
        "questionId": "question-id",
        "score": 90,
        "feedback": "Great technical knowledge demonstrated",
        "suggestions": ["Consider providing more specific examples"]
      }
    ],
    "strengths": ["Strong technical foundation", "Clear communication"],
    "improvements": ["More specific examples", "Better time management"]
  }
}
```

#### POST /api/ai/generate-questions

Generate interview questions using AI.

**Request Body**:
```json
{
  "role": "Software Engineer",
  "level": "Senior",
  "topics": ["React", "Node.js", "Database Design"],
  "count": 10
}
```

**Response**:
```json
{
  "questions": [
    {
      "id": "generated-question-id",
      "question": "Explain the difference between React hooks and class components",
      "type": "technical",
      "difficulty": "medium",
      "topics": ["React", "JavaScript"]
    }
  ]
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Invalid request data
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited:

- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **AI Features**: 10 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Webhooks

The API supports webhooks for real-time updates:

### Events

- `user.created`: New user registered
- `interview.completed`: Interview finished
- `analysis.completed`: AI analysis finished

### Webhook Payload

```json
{
  "event": "interview.completed",
  "data": {
    "interviewId": "interview-id",
    "userId": "user-id",
    "completedAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @interview-app/sdk
```

```typescript
import { InterviewAppClient } from '@interview-app/sdk'

const client = new InterviewAppClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.interview-app.com'
})

const interviews = await client.interviews.list()
```

## Testing

### Postman Collection

Import the Postman collection for testing:

[Download Collection](./postman/InterviewApp-API.postman_collection.json)

### cURL Examples

See individual endpoint documentation for cURL examples.

## Support

For API support:

- **Documentation**: [API Docs](https://docs.interview-app.com)
- **Support**: support@interview-app.com
- **Status**: [Status Page](https://status.interview-app.com)
