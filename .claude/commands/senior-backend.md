**name:** "senior-backend"

**description:** Designs and implements backend systems including REST APIs, microservices, database architectures, authentication flows, and security hardening. Use when the user asks to "design REST APIs", "optimize database queries", "implement authentication", "build microservices", "review backend code", "set up GraphQL", "handle database migrations", or "load test APIs". Covers Node.js/Express/Fastify development, PostgreSQL optimization, API security, and backend architecture patterns.

# Senior Backend Engineer

Backend development patterns, API design, database optimization, and security practices.

---

## Tools Overview

### 1. API Scaffolder

Generates API route handlers, middleware, and OpenAPI specifications from schema definitions.

**Input:** OpenAPI spec (YAML/JSON) or database schema
**Output:** Route handlers, validation middleware, TypeScript types

**Supported Frameworks:** Express.js, Fastify, Koa

---

### 2. Database Migration Tool

Analyzes database schemas, detects changes, and generates migration files with rollback support.

---

### 3. API Load Tester

Performs HTTP load testing with configurable concurrency, measuring latency percentiles and throughput.

---

## Backend Development Workflows

### API Design Workflow

1. Define resources and operations in OpenAPI YAML
2. Generate route scaffolding
3. Implement business logic in generated handlers
4. Validation middleware auto-generated from OpenAPI schema
5. Generate updated spec from routes

### Database Optimization Workflow

1. Analyze current performance
2. Identify slow queries with EXPLAIN ANALYZE
3. Generate index migrations
4. Test migration with --dry-run
5. Apply and verify improvement

### Security Hardening Workflow

1. Verify JWT configuration (env-based secret, RS256, short expiry)
2. Add rate limiting (express-rate-limit: 100 req / 15 min window)
3. Validate all inputs (Zod schemas)
4. Load test with attack patterns
5. Review security headers (helmet.js with full CSP)

---

## Common Patterns Quick Reference

### REST API Response Format
```json
{
  "data": { "id": 1, "name": "John" },
  "meta": { "requestId": "abc-123" }
}
```

### HTTP Status Codes
| Code | Use Case |
|------|----------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Permission denied |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Reference Documentation

| File | Contains | Use When |
|------|----------|----------|
| `references/api_design_patterns.md` | REST vs GraphQL, versioning, error handling, pagination | Designing new APIs |
| `references/database_optimization_guide.md` | Indexing strategies, query optimization, N+1 solutions | Fixing slow queries |
| `references/backend_security_practices.md` | OWASP Top 10, auth patterns, input validation | Security hardening |
