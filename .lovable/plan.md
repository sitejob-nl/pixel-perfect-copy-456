

## Three Issues to Fix

### 1. Taken afvinken — status mismatch bug

**Problem**: `CompanyDetailPage` and `DealTasksTab` use `status: "done"` when toggling tasks, while `TasksPage`, `TaskList`, `TaskListItem`, `TaskBoard`, and `TaskWeekView` all use `status: "completed"`. This means checking off a task on the company page sets it to `"done"`, but the tasks page looks for `"completed"` — so the task never appears as done.

**Fix**: Change `CompanyDetailPage.toggleTask` and `DealTasksTab.toggleTask` to use `"completed"` instead of `"done"`. Also update the checkbox `checked` and styling checks from `=== "done"` to `=== "completed"` in both files.

| File | Change |
|------|--------|
| `src/pages/CompanyDetailPage.tsx` | Replace all `"done"` → `"completed"` in toggleTask + template |
| `src/components/deals/DealTasksTab.tsx` | Same replacement |

---

### 2. Bestanden uploaden bij bedrijven, contacten en taken

**Problem**: No file attachment system exists for these entities.

**Plan**:
1. **New table** `entity_attachments` via migration:
   - `id`, `organization_id`, `entity_type` (company/contact/task), `entity_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `uploaded_by`, `created_at`
   - RLS: org members can read/insert/delete their own org's attachments

2. **Storage bucket** `entity-attachments` (private) with RLS policies for authenticated org members

3. **Reusable component** `src/components/shared/EntityAttachments.tsx`:
   - Props: `entityType`, `entityId`
   - Shows list of uploaded files with name, size, date
   - Upload button → picks file → uploads to `entity-attachments/{org_id}/{entity_type}/{entity_id}/{filename}`
   - Inserts record into `entity_attachments`
   - Download button (signed URL) + delete button
   - Styled in ERP dark theme

4. **Integration**:
   - `CompanyDetailPage`: Add to "Documenten" tab alongside contracts
   - `ContactDetailPage`: Add new "Bestanden" tab (or add to existing tab)
   - `TaskDetailPanel`: Add file attachment section at the bottom of the sheet

---

### 3. Contactpersoon toevoegen: bestaand kiezen OF nieuw aanmaken

**Problem**: On `CompanyDetailPage`, the "Contact toevoegen" button only opens `CreateContactDialog` which always creates a new contact. There's no way to link an existing contact.

**Fix**: Replace with a new `AddContactToCompanyDialog` component:
- **Two modes** via toggle/tabs: "Bestaand contact" | "Nieuw contact"
- **Bestaand**: Searchable dropdown of all contacts (without a company, or with option to reassign). On select → updates `contact.company_id` to the current company.
- **Nieuw**: The existing creation form but with `company_id` pre-filled.

| File | Change |
|------|--------|
| `src/components/shared/AddContactToCompanyDialog.tsx` | New component with both modes |
| `src/pages/CompanyDetailPage.tsx` | Replace `CreateContactDialog` import/usage with new component, pass `companyId` |

---

## Summary of all changes

| Area | Files |
|------|-------|
| Task toggle fix | `CompanyDetailPage.tsx`, `DealTasksTab.tsx` — `"done"` → `"completed"` |
| File uploads | New migration, new `EntityAttachments.tsx` component, integrate into 3 pages |
| Contact linking | New `AddContactToCompanyDialog.tsx`, update `CompanyDetailPage.tsx` |

