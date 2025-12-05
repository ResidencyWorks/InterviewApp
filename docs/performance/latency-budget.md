# Latency Budget

**Purpose**: Define performance targets and component-level latency allocations
**Target**: p95 latency < 10 seconds for evaluation requests
**Last Updated**: 2025-01-27

## Overview

This document defines the latency budget for the Interview App evaluation system. The primary performance target is **p95 latency < 10 seconds** for complete evaluation requests (from submission to result delivery).

## Component Breakdown

### 1. API Request Processing (Target: <500ms)

**Components**:
- Request validation and authentication
- PHI scrubbing (adds <100ms per SC-010)
- Database idempotency check
- Queue enqueue operation

**Allocation**: 500ms
**Monitoring**: API route execution time via Vercel Edge Functions metrics

### 2. Queue Operations (Target: <200ms)

**Components**:
- Job enqueue to BullMQ
- Redis connection overhead
- Job state persistence

**Allocation**: 200ms
**Monitoring**: BullMQ queue metrics, Redis connection latency

### 3. Worker Processing (Target: <8s p95)

**Components**:
- Audio transcription (if applicable): 2-4s typical
- GPT-4 evaluation: 3-5s typical
- Result validation: <100ms
- Database persistence: <200ms

**Allocation**: 8 seconds (p95)
**Monitoring**: Worker execution time via Sentry performance monitoring

### 4. Result Retrieval (Target: <500ms)

**Components**:
- Database query for result
- Cache lookup (if applicable)
- Response serialization

**Allocation**: 500ms
**Monitoring**: API response time metrics

### 5. Network Overhead (Target: <800ms)

**Components**:
- Client-to-server latency
- Server-to-worker communication
- External API calls (OpenAI, Supabase)

**Allocation**: 800ms
**Monitoring**: Network latency via Vercel Edge Functions

## Total Budget

**Sum**: 500ms + 200ms + 8000ms + 500ms + 800ms = **10,000ms (10 seconds)**

This provides a **p95 target of < 10 seconds** with buffer for variability.

## Performance Monitoring

### Metrics Tracked

1. **API Latency**: p50, p95, p99 for `/api/evaluate` endpoint
2. **Queue Depth**: Number of jobs waiting/processing
3. **Worker Processing Time**: Per-job execution time
4. **Database Query Time**: Query execution metrics
5. **External API Latency**: OpenAI API response times

### Monitoring Tools

- **Vercel Analytics**: API route performance
- **Sentry Performance Monitoring**: Worker execution traces
- **PostHog**: User-facing latency metrics
- **BullMQ Metrics**: Queue depth and processing rates

### Alerting Thresholds

- **Warning**: p95 > 8 seconds
- **Critical**: p95 > 12 seconds
- **Queue Depth**: > 50 jobs waiting
- **Worker Failure Rate**: > 5% of jobs

## Optimization Strategies

1. **Caching**: Redis cache for frequently accessed content packs
2. **Batching**: Group similar operations where possible
3. **Model Selection**: Use GPT-4 for quality, consider GPT-3.5 for speed if needed
4. **Connection Pooling**: Optimize database and Redis connections
5. **Idempotency**: Prevent duplicate processing

## Performance Targets Summary

| Component | Target | Measurement |
|-----------|--------|-------------|
| API Processing | <500ms | Vercel Edge Functions |
| Queue Operations | <200ms | BullMQ metrics |
| Worker Processing | <8s p95 | Sentry traces |
| Result Retrieval | <500ms | Database query time |
| Network Overhead | <800ms | Network latency |
| **Total** | **<10s p95** | End-to-end latency |

---

**Note**: These targets are based on typical workloads. Actual performance may vary based on:
- OpenAI API response times
- Network conditions
- Database load
- Concurrent request volume
