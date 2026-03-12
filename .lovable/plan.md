

## Problem

User info@sitejob.nl has `is_active: false` in `organization_members`. When they log in, `useOrganization` returns null, causing a redirect to the onboarding page ("Maak je organisatie aan"). The accept-invite page handles reactivation, but only if the user follows the invite link -- if they log in directly, they're stuck.

## Root Cause

Two issues:
1. When you click the X to remove a member, it sets `is_active = false` but the user's auth account still exists. If they log in again, they see onboarding.
2. When re-inviting the same user, the accept-invite flow *can* reactivate them, but the user has to actually click the invite link and go through accept-invite. If they skip that and just log in, they're stuck.

## Plan

### 1. Fix the immediate data issue
Run a query to reactivate info@sitejob.nl's membership since they were clearly re-invited and accepted (the auth logs show successful invite acceptance at 12:59:55).

### 2. Fix the remove member flow
When removing a member (clicking X), **properly delete** the `organization_members` row instead of just setting `is_active = false`. Also delete the user's Supabase auth account via an edge function so they can be cleanly re-invited later. This prevents zombie memberships.

Alternatively (simpler): Keep the soft-delete approach but fix the **onboarding page** to show a message like "Je account is gedeactiveerd. Neem contact op met de beheerder." instead of showing the "create organization" form when a user has an *inactive* membership.

### 3. Fix the AcceptInvitePage redirect
After accepting an invite, invalidate the `organization` query cache so the `ProtectedRoute` picks up the new membership immediately.

### Recommended approach (simplest, least disruptive)

1. **Reactivate info@sitejob.nl now** via SQL
2. **Update `useOrganization`** to also check for inactive memberships and return a distinct state
3. **Update `ProtectedRoute`** in App.tsx: if user has an inactive membership, show "Account gedeactiveerd" instead of redirecting to onboarding
4. **Update `AcceptInvitePage`**: after accepting, invalidate the `["organization"]` query key so routing works immediately

### Files to change
- `src/hooks/useOrganization.ts` -- return inactive membership info
- `src/App.tsx` -- handle deactivated state in ProtectedRoute
- `src/pages/AcceptInvitePage.tsx` -- invalidate org query after accepting

