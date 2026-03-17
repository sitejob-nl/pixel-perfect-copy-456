

## Problem

In `useLinkedInGenerator.ts` line 78, when none of the chained optional accesses find a string value, `String(aiResult)` produces `"[object Object]"` — but in some edge cases `aiResult` itself could be `null`/`undefined`, and downstream code calls `.trim()` on the result without checking.

## Fix

In `src/hooks/useLinkedInGenerator.ts`, add a safety check on line 72-78:

```typescript
const raw = aiResult;
const message =
  typeof raw === "string"
    ? raw
    : raw?.content?.[0]?.text ||
      raw?.choices?.[0]?.message?.content ||  // OpenAI-style response format
      raw?.message ||
      raw?.text ||
      "";
```

Key change: add `raw?.choices?.[0]?.message?.content` (the `ask-sitejob` function likely returns an OpenAI-compatible response format), and fallback to empty string `""` instead of `String(aiResult)` which produces non-trimmable objects.

Single file edit, ~3 lines changed.

