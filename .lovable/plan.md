

## Problem Analysis

When Jens clicks the invite link, the following broken flow occurs:

1. `/accept-invite?invite_token=xxx` → not logged in → redirects to `/auth?redirect=/accept-invite?invite_token=xxx`
2. Jens logs in or signs up on `/auth`
3. `AuthRoute` sees a session → **always redirects to `/dashboard`** (ignores `?redirect=` param)
4. `ProtectedRoute` on `/dashboard` checks org membership → no membership → redirects to `/onboarding`
5. Jens sees "Maak je organisatie aan" instead of accepting the invite

Three fixes needed:

## Fix 1: `AuthRoute` — Respect redirect parameter

In `src/App.tsx`, the `AuthRoute` component currently does `<Navigate to="/dashboard" />` when there's a session. Change it to read the `redirect` search param and navigate there instead if present.

## Fix 2: `AuthPage` — Preserve redirect param after login/signup

In `src/pages/AuthPage.tsx`:
- Read `redirect` from `useSearchParams`
- After successful login (`signInWithPassword`), navigate to the redirect URL if present
- For signup `emailRedirectTo`, append the redirect param so the email confirmation link brings them back to the right place
- After successful login, use `navigate(redirect || '/dashboard')` instead of relying on `AuthRoute`

## Fix 3: `AuthPage` — Navigate on auth state change

Since `AuthRoute` redirects on session presence, the login flow should work if Fix 1 is applied. But to be safe, after `signInWithPassword` succeeds, explicitly navigate to the redirect URL.

## Summary of changes

| File | Change |
|------|--------|
| `src/App.tsx` (`AuthRoute`) | Read `?redirect=` search param, navigate there instead of hardcoded `/dashboard` |
| `src/pages/AuthPage.tsx` | Read `?redirect=` param, preserve it in `emailRedirectTo` for signup, and navigate to it after login |

No database or edge function changes needed — the `accept-invite` edge function and `AcceptInvitePage` work correctly already. The issue is purely in the auth routing.

