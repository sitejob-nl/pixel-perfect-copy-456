

## Problem

The `demo-service` edge function's `generate` action returns `{ id: "xxx" }` without `demo_html` or `pages` inline. The frontend then tries to poll `check-generation` — but that action returns 404 (not implemented in the edge function). So the wizard gets stuck on step 3 spinning forever.

## Solution

Replace the broken polling mechanism with direct Supabase database queries. After `generate` returns a `demo_id`, poll the `demos` table and `demo_pages` table directly instead of calling the non-existent `check-generation` action.

## Changes

### `src/components/demos/DemoWizard.tsx`

1. **Replace `usePollStatus("check-generation", ...)` with a direct Supabase query**:
   - Poll `demos` table for `generation_status` field on the demo record
   - When status is `completed`, fetch `demo_pages` for that demo
   - When status is `failed`, show error

2. **Add a fallback timeout**: If after ~3 minutes it's still "generating", show a retry option instead of spinning forever.

The polling logic changes from:
```
usePollStatus("check-generation", { demo_id }, 3000, enabled)
```
To a `useQuery` that directly queries Supabase:
```typescript
useQuery({
  queryKey: ["demo-gen-status", generationId],
  enabled: !!generationId && step === 3 && !generationDone,
  refetchInterval: 3000,
  queryFn: async () => {
    const { data: demo } = await supabase
      .from("demos")
      .select("id, generation_status, demo_html")
      .eq("id", generationId)
      .single();
    const { data: pages } = await supabase
      .from("demo_pages")
      .select("*")
      .eq("demo_id", generationId)
      .order("sort_order");
    return { demo, pages };
  }
});
```

3. **Update the `useEffect` that handles completion** to work with the new query shape — check `demo.generation_status === "completed"` or if `pages` have `html_content` filled in.

| File | Change |
|------|--------|
| `src/components/demos/DemoWizard.tsx` | Replace `usePollStatus("check-generation")` with direct Supabase polling; update completion effect; add timeout fallback |

