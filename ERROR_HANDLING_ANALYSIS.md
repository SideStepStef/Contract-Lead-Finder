# API Error Handling Analysis

**Date:** June 19, 2026  
**Repository:** SideStepStef/Contract-Lead-Finder  
**Scope:** Express API server & React API client error handling

---

## Executive Summary

The application has **moderate error handling coverage** with both strengths and critical gaps:

| Aspect | Status | Details |
|--------|--------|---------|
| **Input Validation** | ✅ Good | Zod schemas on all routes |
| **HTTP Status Codes** | ✅ Good | Appropriate status codes (400, 404, 503, 502) |
| **Error Messages** | ⚠️ Partial | Some routes provide detail; others are generic |
| **Database Errors** | ❌ Missing | No try-catch on database operations |
| **Logging** | ✅ Good | pino-http middleware logs all requests |
| **Client-side Error Handling** | ✅ Excellent | Comprehensive error classes and parsing |

---

## ✅ Strengths

### 1. **Comprehensive Input Validation (Zod)**

All routes validate input using Zod schemas:

```typescript
// leads.ts, lines 64-68
const parsed = ListLeadsQueryParams.safeParse(req.query);
if (!parsed.success) {
  res.status(400).json({ error: "Invalid query params" });
  return;
}
```

**Coverage:**
- `POST /leads` — Body validation with `CreateLeadBody`
- `GET /leads` — Query param validation with `ListLeadsQueryParams`
- `PATCH /leads/:id` — Both params and body validated
- `POST /leads/:id/notes` — Content validation

### 2. **Appropriate HTTP Status Codes**

| Route | Scenario | Status | Example |
|-------|----------|--------|---------|
| **POST** | Created successfully | 201 | `res.status(201).json()` (leads.ts:120) |
| **GET** | Resource not found | 404 | `res.status(404).json({ error: "Lead not found" })` |
| **POST** | Invalid input | 400 | `res.status(400).json({ error: "Invalid query params" })` |
| **GET** | Service unavailable | 503 | `res.status(503).json({ error: "SMTP not configured" })` (reminders.ts:24) |
| **GET** | External API failure | 502 | `res.status(502).json({ error: "SAM.gov returned 500" })` (opportunities.ts:36) |
| **DELETE** | Success with no content | 204 | `res.status(204).send()` (leads.ts:204) |

### 3. **Client-side Error Handling (Excellent)**

The `custom-fetch.ts` has sophisticated error handling:

**Custom Error Classes:**

```typescript
// ApiError class (lines 174-200)
export class ApiError<T = unknown> extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
}

// ResponseParseError class (lines 202-234)
export class ResponseParseError extends Error {
  readonly rawBody: string;
  readonly cause: unknown;
  // ... tracks unparseable responses
}
```

**Smart Error Message Building (lines 151-172):**

```typescript
function buildErrorMessage(response: Response, data: unknown): string {
  // Tries multiple error field names:
  // - title, detail (RFC 7807 Problem Details)
  // - message, error_description, error (common APIs)
  // Falls back to HTTP status text if no data
}
```

**Robust Response Parsing (lines 254-283):**

```typescript
async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  // Handles:
  // - No body (204, HEAD requests)
  // - JSON parsing failures (catches and returns raw text)
  // - Non-JSON responses (blob, text)
  // - BOM stripping
}
```

### 4. **Request Logging with pino-http**

```typescript
// app.ts, lines 9-27
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { /* logs request ID, method, URL */ },
      res(res) { /* logs status code */ },
    },
  }),
);
```

All requests automatically logged with:
- Request ID (request tracing)
- HTTP method & URL (with query params stripped)
- Response status code

---

## ❌ Critical Gaps

### 1. **No Try-Catch Around Database Operations**

**Problem:** Unhandled database errors will crash routes.

**Example (leads.ts, lines 101-118):**

```typescript
// ❌ NO TRY-CATCH
const [lead] = await db
  .insert(leadsTable)
  .values({...})
  .returning();

res.status(201).json(formatLead(lead));
```

**Scenarios that cause crashes:**
- Database connection failure
- Constraint violation (duplicate key, foreign key)
- Disk full / out of memory
- SQL injection attempt (though Drizzle prevents this)

**Affected routes:**
- All routes in `leads.ts`
- All routes in `notes.ts`
- `opportunities.ts` import endpoint

### 2. **Insufficient Error Details in Responses**

Some routes return vague error messages:

```typescript
// opportunities.ts, line 36
res.status(502).json({ error: `SAM.gov returned ${response.status}` });

// ❌ Should include: error cause, retry advice, request details
```

**Better approach:**

```typescript
res.status(502).json({
  error: `SAM.gov API unavailable (HTTP ${response.status})`,
  detail: text.slice(0, 200), // First 200 chars of API response
  retry: true,
  setupUrl: SETUP_URL,
});
```

### 3. **Generic Error Handling in Reminders**

```typescript
// reminders.ts, lines 32-34
try {
  const result = await sendReminderEmail(config, true);
  res.json(result);
} catch (err) {
  res.status(500).json({ error: String(err) });  // ❌ Converts Error to string
}
```

**Problem:** `String(err)` may expose sensitive details (stack traces, file paths).

**Better:**

```typescript
catch (err) {
  console.error("Email send failed:", err); // Log for debugging
  res.status(500).json({
    error: "Failed to send reminder email",
    code: "SMTP_ERROR",
  });
}
```

### 4. **No Input Validation on Import Route**

```typescript
// opportunities.ts, lines 57-73
router.post("/opportunities/import", async (req, res) => {
  const { noticeId, title, agency, ... } = req.body as {
    noticeId: string;
    title: string;
    // ... type assertion without validation!
  };

  if (!title || !noticeId) {
    res.status(400).json({ error: "title and noticeId are required" });
    return;
  }
  // ... but other fields could be null/undefined/wrong type
});
```

**Missing:**
- Type-safe validation with Zod
- Length limits on string fields
- Invalid date format handling (parseDeadline catches it but silently returns null)

### 5. **No Global Error Handler**

The Express app has no catch-all error middleware:

```typescript
// app.ts (missing)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Handle unhandled errors
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});
```

**Without this:**
- Unhandled database errors crash the Express process
- No structured logging of unexpected errors
- No opportunity for error tracking/monitoring

---

## ⚠️ Medium Priority Issues

### 1. **Missing Null Checks**

Some routes assume database queries return results:

```typescript
// leads.ts, lines 101-118
const [lead] = await db.insert(...).returning();
res.status(201).json(formatLead(lead)); // ❌ lead could be undefined
```

**Better:**

```typescript
const leads = await db.insert(...).returning();
if (leads.length === 0) {
  res.status(500).json({ error: "Failed to insert lead" });
  return;
}
res.status(201).json(formatLead(leads[0]));
```

### 2. **Inconsistent Error Response Format**

Some endpoints return `{ error: string }`:
```typescript
res.status(400).json({ error: "Invalid query params" });
```

Others return `{ error: string, setupUrl: string }`:
```typescript
res.status(503).json({
  error: "SAM.gov API key not configured",
  setupUrl: SETUP_URL,
});
```

**Better:** Standardize to:

```typescript
{
  error: string;           // Human-readable message
  code: string;            // Machine-readable error code
  detail?: string;         // Additional context
  setupUrl?: string;       // For configuration errors
}
```

---

## 🔧 Recommended Fixes (Priority Order)

### Priority 1: Add Global Error Handler (5 mins)

```typescript
// app.ts - add before app.listen()
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled error", err);
    
    if (res.headersSent) return; // Headers already sent
    
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
);
```

### Priority 2: Wrap Database Operations (30 mins)

Create a utility function:

```typescript
// lib/db-utils.ts
export async function withDbError<T>(
  fn: () => Promise<T>,
  res: Response,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    logger.error("Database error", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Database operation failed",
        code: "DB_ERROR",
      });
    }
    return null;
  }
}
```

Usage:

```typescript
const lead = await withDbError(
  () => db.insert(leadsTable).values({...}).returning(),
  res,
);
if (!lead) return;
```

### Priority 3: Standardize Error Responses (15 mins)

Create error response types:

```typescript
// lib/error-responses.ts
export const ErrorResponses = {
  INVALID_INPUT: (detail?: string) => ({
    error: "Invalid input",
    code: "INVALID_INPUT",
    detail,
  }),
  NOT_FOUND: (resource: string) => ({
    error: `${resource} not found`,
    code: "NOT_FOUND",
  }),
  SERVICE_UNAVAILABLE: (service: string, setupUrl?: string) => ({
    error: `${service} not configured`,
    code: "CONFIG_MISSING",
    setupUrl,
  }),
};
```

### Priority 4: Add Zod Validation to Import Route (10 mins)

```typescript
const ImportOpportunitySchema = z.object({
  noticeId: z.string().min(1),
  title: z.string().min(1),
  agency: z.string().optional(),
  responseDeadLine: z.string().optional(),
  naicsCode: z.string().optional(),
  type: z.string().optional(),
  awardAmount: z.number().optional(),
  uiLink: z.string().url(),
});

router.post("/opportunities/import", async (req, res) => {
  const parsed = ImportOpportunitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // ... use parsed.data
});
```

---

## 📊 Error Handling Scorecard

| Category | Score | Status |
|----------|-------|--------|
| **Input Validation** | 8/10 | Good coverage; missing one route |
| **HTTP Status Codes** | 9/10 | Appropriate and consistent |
| **Error Messages** | 6/10 | Inconsistent format and detail |
| **Database Error Handling** | 2/10 | **CRITICAL GAP** |
| **Global Error Handler** | 0/10 | **MISSING** |
| **Client-side Handling** | 10/10 | Excellent |
| **Logging** | 8/10 | Good with pino; missing error logs |
| **Error Tracking** | 0/10 | No Sentry/error reporting |
| **Security** | 7/10 | Generally safe; avoid error leaks |
| **Documentation** | 0/10 | No error response docs |
| | | |
| **Overall** | 5.0/10 | **Needs attention before launch** |

---

## 🎯 Pre-Launch Checklist

- [ ] Add global Express error handler
- [ ] Wrap all database operations with try-catch
- [ ] Standardize error response format
- [ ] Add Zod validation to import route
- [ ] Add error logging for unexpected failures
- [ ] Document API error response format in OpenAPI spec
- [ ] Test error scenarios (DB failure, network timeout, invalid input)
- [ ] Set up error tracking (Sentry or similar)

---

## Conclusion

**The app is NOT production-ready from an error handling perspective.** The client-side error handling is excellent, but the server lacks:

1. Global error handler (crash risk)
2. Database error handling (silent failures)
3. Consistent error response format
4. Error tracking/monitoring

**Estimated Fix Time:** 1-2 hours

**Impact:** Prevents production crashes and improves debugging.
