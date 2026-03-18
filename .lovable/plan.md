

## Probleem

1. **Super admin bypass**: De `user_organization_ids()` functie retourneert alle org IDs voor super_admins. Dit is gewenst voor het admin-paneel, maar in de gewone UI moet je alleen je eigen org zien.

2. **Policy role te breed**: De policies op `contacts` en `companies` gebruiken role `{public}` in plaats van `{authenticated}`. Dit betekent dat ook niet-ingelogde requests (anon) door de policy gaan (al faalt `auth.uid()` dan).

## Oplossing

### 1. Frontend-fix: org_id filter in queries

De `useContacts` hook filtert al op `orgId` via de queryKey maar voegt **geen** `.eq("organization_id", orgId)` filter toe aan de Supabase query. Hetzelfde geldt voor `useCompanies`. Dit moet worden toegevoegd zodat super_admins in de UI alleen hun eigen org-data zien.

**Bestanden aan te passen:**
- `src/hooks/useContacts.ts` — voeg `.eq("organization_id", orgId)` toe
- `src/hooks/useCompanies.ts` — idem

### 2. RLS policies aanscherpen

Verander de role van `{public}` naar `{authenticated}` op de `contacts` en `companies` policies, zodat alleen ingelogde gebruikers data kunnen opvragen.

**Migration:**
```sql
DROP POLICY "Org member access" ON contacts;
CREATE POLICY "Org member access" ON contacts FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));

DROP POLICY "Org member access" ON companies;
CREATE POLICY "Org member access" ON companies FOR ALL TO authenticated
  USING (organization_id IN (SELECT user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT user_organization_ids()));
```

Dit is een defense-in-depth aanpak: de frontend filtert op org_id, en de RLS policies voorkomen onbevoegde toegang op databaseniveau.

