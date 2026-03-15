

## Probleem

Field name mismatch: de wizard stuurt `pages` maar de backend verwacht `page_config`.

- `DemoWizard.tsx` regel 262: stuurt `pages: enabledPages.map(...)`
- `useDemos.ts` regel 276: type definitie heeft `pages?: { title: string; slug: string; description: string }[]`
- `callDemoService` op regel 280 stuurt de payload 1-op-1 door naar de edge function met `{ action: "generate", ...payload }` — dus het veld komt als `pages` binnen bij de backend, niet als `page_config`

## Fix

### 1. `useDemos.ts` — Rename type en payload field

Regel 276: rename `pages` naar `page_config` in de type definitie.

### 2. `DemoWizard.tsx` — Rename property in de generate call

Regel 262: verander `pages:` naar `page_config:`.

Dat is alles — twee regels, zelfde data, correcte field name.

