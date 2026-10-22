-- Authorized ERP access remediation. Project fuvpmxxihmpustftzvgk only.
-- Preserve all view columns/definitions inside a scope wrapper; preserve authenticated/service_role ACLs.
-- Apply using Supabase apply_migration. Root must review this prepared file before applying.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='45s';

DO $erp_guard$
DECLARE expected jsonb; current_view record;
BEGIN
FOR expected IN SELECT value FROM jsonb_array_elements('[{"view":"email_stats_by_org","definition":" SELECT organization_id,\n    count(*) AS total,\n    count(*) FILTER (WHERE status = ANY (ARRAY[''sent''::text, ''delivered''::text, ''opened''::text, ''clicked''::text])) AS sent,\n    count(*) FILTER (WHERE status = ANY (ARRAY[''delivered''::text, ''opened''::text, ''clicked''::text])) AS delivered,\n    count(*) FILTER (WHERE status = ANY (ARRAY[''opened''::text, ''clicked''::text])) AS opened,\n    count(*) FILTER (WHERE status = ''clicked''::text) AS clicked,\n    count(*) FILTER (WHERE status = ''bounced''::text) AS bounced,\n    count(*) FILTER (WHERE status = ''failed''::text) AS failed,\n    COALESCE(sum(opened_count), 0::bigint)::integer AS total_opens,\n    COALESCE(sum(clicked_count), 0::bigint)::integer AS total_clicks,\n    max(sent_at) AS last_sent_at\n   FROM email_sends\n  GROUP BY organization_id;","acl":"{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"sdr_daily_stats","definition":" SELECT date_trunc(''day''::text, created_at) AS day,\n    count(*) FILTER (WHERE direction = ''outbound''::text) AS sent,\n    count(*) FILTER (WHERE direction = ''inbound''::text) AS received,\n    count(*) FILTER (WHERE classification = ''interested''::text) AS interested\n   FROM outreach_messages\n  GROUP BY (date_trunc(''day''::text, created_at))\n  ORDER BY (date_trunc(''day''::text, created_at)) DESC;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"sdr_pipeline","definition":" SELECT status,\n    count(*) AS total,\n    count(*) FILTER (WHERE relevance_score >= 7) AS high_score,\n    avg(relevance_score)::numeric(3,1) AS avg_score\n   FROM leads\n  GROUP BY status;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_call_log","definition":" SELECT cl.id,\n    cl.organization_id,\n    cl.voys_call_id,\n    cl.direction,\n    cl.status,\n    cl.caller_number,\n    cl.caller_name,\n    cl.caller_account_number,\n    cl.caller_user_email,\n    cl.destination_number,\n    cl.destination_name,\n    cl.destination_account_number,\n    cl.destination_user_email,\n    cl.started_at,\n    cl.answered_at,\n    cl.ended_at,\n    cl.duration_seconds,\n    cl.ring_duration_seconds,\n    cl.has_recording,\n    cl.recording_url,\n    cl.recording_storage_path,\n    cl.recording_duration_seconds,\n    cl.has_transcription,\n    cl.transcription_text,\n    cl.transcription_summary,\n    cl.transcription_language,\n    cl.sentiment,\n    cl.ai_summary,\n    cl.ai_action_items,\n    cl.matched_contact_id,\n    cl.matched_company_id,\n    cl.matched_project_id,\n    cl.matched_user_id,\n    cl.created_activity_id,\n    cl.webhook_payloads,\n    cl.tags,\n    cl.notes,\n    cl.created_at,\n    cl.updated_at,\n    (ct.first_name || '' ''::text) || COALESCE(ct.last_name, ''''::text) AS contact_name,\n    co.name AS company_name,\n    p.full_name AS user_name,\n        CASE\n            WHEN cl.duration_seconds IS NULL THEN ''—''::text\n            WHEN cl.duration_seconds < 60 THEN cl.duration_seconds || ''s''::text\n            ELSE (cl.duration_seconds / 60) || ''min''::text\n        END AS duration_display,\n        CASE cl.status\n            WHEN ''ended''::text THEN ''Afgerond''::text\n            WHEN ''missed''::text THEN ''Gemist''::text\n            WHEN ''in_progress''::text THEN ''Bezig''::text\n            WHEN ''ringing''::text THEN ''Rinkelt''::text\n            ELSE cl.status\n        END AS status_label\n   FROM call_log cl\n     LEFT JOIN contacts ct ON cl.matched_contact_id = ct.id\n     LEFT JOIN companies co ON cl.matched_company_id = co.id\n     LEFT JOIN profiles p ON cl.matched_user_id = p.id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_comments","definition":" SELECT c.id,\n    c.organization_id,\n    c.entity_type,\n    c.entity_id,\n    c.parent_id,\n    c.user_id,\n    c.content,\n    c.is_edited,\n    c.edited_at,\n    c.mentions,\n    c.created_at,\n    p.full_name AS author_name,\n    p.email AS author_email,\n    ( SELECT count(*) AS count\n           FROM comments r\n          WHERE r.parent_id = c.id) AS reply_count\n   FROM comments c\n     JOIN profiles p ON c.user_id = p.id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_company_email_stats","definition":" SELECT c.id AS company_id,\n    c.organization_id,\n    c.name AS company_name,\n    count(ge.id) AS total_emails,\n    count(ge.id) FILTER (WHERE ge.direction = ''inbound''::text) AS received,\n    count(ge.id) FILTER (WHERE ge.direction = ''outbound''::text) AS sent,\n    max(ge.received_at) AS last_email_at,\n    count(ge.id) FILTER (WHERE ge.received_at > (now() - ''7 days''::interval)) AS this_week,\n    count(ge.id) FILTER (WHERE ge.category = ''support''::text) AS support_count\n   FROM companies c\n     LEFT JOIN google_emails ge ON ge.company_id = c.id\n  GROUP BY c.id, c.organization_id, c.name;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_company_health","definition":" SELECT id,\n    organization_id,\n    name,\n    industry,\n    city,\n    kvk_number,\n    last_activity_at,\n    EXTRACT(day FROM now() - COALESCE(last_activity_at, created_at))::integer AS days_since_activity,\n        CASE\n            WHEN last_activity_at IS NULL THEN ''unknown''::text\n            WHEN EXTRACT(day FROM now() - last_activity_at) <= 14::numeric THEN ''green''::text\n            WHEN EXTRACT(day FROM now() - last_activity_at) <= 30::numeric THEN ''orange''::text\n            ELSE ''red''::text\n        END AS health_status,\n    (( SELECT count(*) AS count\n           FROM projects p\n          WHERE p.company_id = c.id AND (p.status <> ALL (ARRAY[''completed''::text, ''cancelled''::text]))))::integer AS active_projects,\n    ( SELECT COALESCE(sum(s.monthly_amount), 0::numeric) AS \"coalesce\"\n           FROM subscriptions s\n             JOIN projects p ON s.project_id = p.id\n          WHERE p.company_id = c.id AND s.status = ''active''::text) AS total_mrr,\n    (( SELECT count(*) AS count\n           FROM invoices i\n             JOIN projects p ON i.project_id = p.id\n          WHERE p.company_id = c.id AND (i.status = ANY (ARRAY[''sent''::text, ''overdue''::text]))))::integer AS open_invoices\n   FROM companies c;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_demos","definition":" SELECT d.id,\n    d.organization_id,\n    d.title,\n    d.company_name,\n    d.demo_type,\n    d.is_public,\n    d.public_slug,\n    d.views,\n    d.visitor_count,\n    d.model_used,\n    d.generation_status,\n    d.generation_duration_seconds,\n    d.is_multipage,\n    d.branding,\n    d.created_at,\n    d.updated_at,\n    d.company_id,\n    d.deal_id,\n    d.crawl_job_id,\n    co.name AS linked_company_name,\n    co.industry AS company_industry,\n    ( SELECT count(*) AS count\n           FROM demo_pages dp\n          WHERE dp.demo_id = d.id AND dp.is_active = true) AS page_count,\n    ( SELECT count(*) AS count\n           FROM demo_feedback df\n          WHERE df.demo_id = d.id) AS feedback_count,\n    (ct.first_name || '' ''::text) || COALESCE(ct.last_name, ''''::text) AS contact_name,\n    ct.email AS contact_email\n   FROM demos d\n     LEFT JOIN companies co ON d.company_id = co.id\n     LEFT JOIN contacts ct ON d.contact_id = ct.id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_email_drafts","definition":" SELECT es.id,\n    es.organization_id,\n    es.subject,\n    es.html_content,\n    es.to_address,\n    es.status,\n    es.trigger_event,\n    es.step_number,\n    es.created_at,\n    es.ai_generated,\n    es.merge_data,\n    (ct.first_name || '' ''::text) || COALESCE(ct.last_name, ''''::text) AS contact_name,\n    co.name AS company_name,\n    p.name AS project_name,\n    seq.name AS sequence_name,\n        CASE es.trigger_event\n            WHEN ''quote_sent''::text THEN ''Offerte follow-up''::text\n            WHEN ''quote_no_response''::text THEN ''Offerte herinnering''::text\n            WHEN ''project_delivered''::text THEN ''Oplevering feedback''::text\n            WHEN ''booking_completed''::text THEN ''Meeting follow-up''::text\n            WHEN ''contact_created''::text THEN ''Welkomstmail''::text\n            WHEN ''client_inactive''::text THEN ''Reactivatie''::text\n            WHEN ''invoice_overdue''::text THEN ''Betaalherinnering''::text\n            WHEN ''manual''::text THEN ''Handmatig''::text\n            ELSE es.trigger_event\n        END AS trigger_label\n   FROM email_sends es\n     LEFT JOIN contacts ct ON es.contact_id = ct.id\n     LEFT JOIN companies co ON es.company_id = co.id\n     LEFT JOIN projects p ON es.project_id = p.id\n     LEFT JOIN outreach_sequences seq ON es.sequence_id = seq.id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_email_threads","definition":" SELECT thread_id,\n    organization_id,\n    connection_id,\n    min(received_at) AS started_at,\n    max(received_at) AS last_message_at,\n    count(*) AS message_count,\n    (array_agg(subject ORDER BY received_at))[1] AS subject,\n    (array_agg(contact_id ORDER BY received_at) FILTER (WHERE contact_id IS NOT NULL))[1] AS contact_id,\n    (array_agg(company_id ORDER BY received_at) FILTER (WHERE company_id IS NOT NULL))[1] AS company_id,\n    (array_agg(project_id ORDER BY received_at) FILTER (WHERE project_id IS NOT NULL))[1] AS project_id,\n    (array_agg(category ORDER BY received_at) FILTER (WHERE category IS NOT NULL))[1] AS category,\n    (array_agg(from_name ORDER BY received_at DESC))[1] AS last_sender,\n    (array_agg(snippet ORDER BY received_at DESC))[1] AS last_snippet,\n    bool_or(direction = ''inbound''::text AND is_read = false) AS has_unread\n   FROM google_emails ge\n  GROUP BY thread_id, organization_id, connection_id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_klanten","definition":" SELECT c.id,\n    c.organization_id,\n    c.name,\n    c.industry,\n    c.city,\n    c.website,\n    c.phone,\n    c.email,\n    c.kvk_number,\n    c.company_size,\n    c.last_activity_at,\n    c.primary_contact_id,\n    pc.first_name AS contact_voornaam,\n    pc.last_name AS contact_achternaam,\n    (pc.first_name || '' ''::text) || COALESCE(pc.last_name, ''''::text) AS contact_naam,\n    pc.email AS contact_email,\n    pc.phone AS contact_telefoon,\n    pc.job_title AS contact_functie,\n    pc.temperature AS contact_temperatuur,\n    pc.lead_score AS contact_score,\n    ( SELECT count(*) AS count\n           FROM contacts ct\n          WHERE ct.company_id = c.id) AS aantal_contacten,\n    ( SELECT count(*) AS count\n           FROM projects p\n          WHERE p.company_id = c.id AND (p.status = ANY (ARRAY[''in_progress''::text, ''review''::text, ''accepted''::text, ''quoted''::text]))) AS actieve_projecten,\n    ( SELECT count(*) AS count\n           FROM projects p\n          WHERE p.company_id = c.id) AS totaal_projecten,\n    ( SELECT COALESCE(sum(s.monthly_amount), 0::numeric) AS \"coalesce\"\n           FROM subscriptions s\n             JOIN projects p ON s.project_id = p.id\n          WHERE p.company_id = c.id AND s.status = ''active''::text) AS mrr,\n    ( SELECT count(*) AS count\n           FROM deals d\n             JOIN pipeline_stages ps ON d.stage_id = ps.id\n          WHERE d.company_id = c.id AND NOT COALESCE(ps.is_won, false) AND NOT COALESCE(ps.is_lost, false)) AS open_deals,\n        CASE\n            WHEN c.last_activity_at IS NULL THEN ''unknown''::text\n            WHEN c.last_activity_at > (now() - ''14 days''::interval) THEN ''green''::text\n            WHEN c.last_activity_at > (now() - ''30 days''::interval) THEN ''orange''::text\n            ELSE ''red''::text\n        END AS gezondheid,\n        CASE\n            WHEN c.last_activity_at IS NULL THEN NULL::integer\n            ELSE EXTRACT(day FROM now() - c.last_activity_at)::integer\n        END AS dagen_stil,\n    ( SELECT a.subject\n           FROM activities a\n          WHERE a.company_id = c.id\n          ORDER BY a.created_at DESC\n         LIMIT 1) AS laatste_activiteit,\n    ( SELECT count(*) AS count\n           FROM google_emails ge\n          WHERE ge.company_id = c.id AND ge.received_at > (now() - ''30 days''::interval)) AS emails_30d,\n    ( SELECT count(*) AS count\n           FROM call_log cl\n          WHERE cl.matched_company_id = c.id AND cl.started_at > (now() - ''30 days''::interval)) AS calls_30d,\n    c.created_at\n   FROM companies c\n     LEFT JOIN contacts pc ON c.primary_contact_id = pc.id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_my_tasks","definition":" SELECT t.id,\n    t.organization_id,\n    t.project_id,\n    t.company_id,\n    t.contact_id,\n    t.deal_id,\n    t.assigned_to,\n    t.created_by,\n    t.title,\n    t.description,\n    t.status,\n    t.priority,\n    t.due_date,\n    t.completed_at,\n    t.completed_by,\n    t.created_at,\n    t.updated_at,\n    p.name AS project_name,\n    p.project_number,\n    c.name AS company_name,\n    prof.full_name AS assigned_to_name,\n        CASE\n            WHEN t.due_date < CURRENT_DATE AND (t.status <> ALL (ARRAY[''done''::text, ''cancelled''::text])) THEN ''overdue''::text\n            WHEN t.due_date = CURRENT_DATE THEN ''today''::text\n            WHEN t.due_date = (CURRENT_DATE + 1) THEN ''tomorrow''::text\n            WHEN t.due_date <= (CURRENT_DATE + 7) THEN ''this_week''::text\n            ELSE ''later''::text\n        END AS urgency\n   FROM tasks t\n     LEFT JOIN projects p ON t.project_id = p.id\n     LEFT JOIN companies c ON t.company_id = c.id\n     LEFT JOIN profiles prof ON t.assigned_to = prof.id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_project_timeline","definition":" SELECT a.id,\n    a.organization_id,\n    a.project_id,\n    ''activity''::text AS source,\n    a.activity_type AS event_type,\n    a.subject AS title,\n    a.description,\n    a.user_id AS actor_id,\n    a.created_at AS event_at,\n    jsonb_build_object(''status'', a.status, ''priority'', a.priority, ''outcome'', a.outcome) AS metadata\n   FROM activities a\n  WHERE a.project_id IS NOT NULL\nUNION ALL\n SELECT su.id,\n    su.organization_id,\n    su.project_id,\n    ''status_update''::text AS source,\n    su.update_type AS event_type,\n    su.title,\n    su.message AS description,\n    su.sent_by AS actor_id,\n    su.created_at AS event_at,\n    jsonb_build_object(''is_sent'', su.is_sent, ''sent_at'', su.sent_at) AS metadata\n   FROM project_status_updates su\nUNION ALL\n SELECT i.id,\n    i.organization_id,\n    i.project_id,\n    ''invoice''::text AS source,\n    i.status AS event_type,\n    ''Factuur ''::text || i.invoice_number AS title,\n    ''€''::text || COALESCE(i.total_amount::text, ''0''::text) AS description,\n    NULL::uuid AS actor_id,\n    i.created_at AS event_at,\n    jsonb_build_object(''total_amount'', i.total_amount, ''due_date'', i.due_date) AS metadata\n   FROM invoices i\n  WHERE i.project_id IS NOT NULL\nUNION ALL\n SELECT ci.id,\n    ci.organization_id,\n    ci.project_id,\n    ''checklist''::text AS source,\n    ''completed''::text AS event_type,\n    ''✓ ''::text || ci.title AS title,\n    ci.description,\n    ci.completed_by AS actor_id,\n    ci.completed_at AS event_at,\n    jsonb_build_object(''is_required'', ci.is_required) AS metadata\n   FROM project_checklist_items ci\n  WHERE ci.is_completed = true\nUNION ALL\n SELECT cl.id,\n    cl.organization_id,\n    cl.matched_project_id AS project_id,\n    ''call''::text AS source,\n    cl.direction AS event_type,\n    (''📞 ''::text ||\n        CASE cl.direction\n            WHEN ''inbound''::text THEN ''Inkomend: ''::text\n            ELSE ''Uitgaand: ''::text\n        END) || COALESCE(cl.caller_name, cl.caller_number) AS title,\n        CASE\n            WHEN cl.duration_seconds IS NOT NULL THEN (cl.duration_seconds / 60) || '' min''::text\n            ELSE ''''::text\n        END AS description,\n    cl.matched_user_id AS actor_id,\n    COALESCE(cl.ended_at, cl.started_at) AS event_at,\n    jsonb_build_object(''has_recording'', cl.has_recording, ''has_transcription'', cl.has_transcription) AS metadata\n   FROM call_log cl\n  WHERE cl.matched_project_id IS NOT NULL AND (cl.status = ANY (ARRAY[''ended''::text, ''missed''::text]))\nUNION ALL\n SELECT ge.id,\n    ge.organization_id,\n    ge.project_id,\n    ''email''::text AS source,\n    ge.direction AS event_type,\n        CASE ge.direction\n            WHEN ''inbound''::text THEN ''📧 Van: ''::text\n            ELSE ''📧 Naar: ''::text\n        END || COALESCE(ge.from_name, ge.from_email) AS title,\n    ge.subject AS description,\n    ge.user_id AS actor_id,\n    ge.received_at AS event_at,\n    jsonb_build_object(''gmail_id'', ge.gmail_message_id, ''thread_id'', ge.thread_id, ''category'', ge.category, ''snippet'', ge.snippet) AS metadata\n   FROM google_emails ge\n  WHERE ge.project_id IS NOT NULL;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_prospect_leads","definition":" SELECT pl.id,\n    pl.pool_id,\n    pl.organization_id,\n    pl.status,\n    pl.company_name,\n    pl.website_url,\n    pl.city,\n    pl.google_rating,\n    pl.google_review_count,\n    pl.score,\n    pl.fit_summary,\n    pl.contact_name,\n    pl.contact_email,\n    pl.contact_source,\n    pl.demo_id,\n    pl.demo_url,\n    pl.demo_view_count,\n    pl.demo_viewed_at,\n    pl.email_subject,\n    pl.email_sent_at,\n    pl.email_opened_at,\n    pl.email_replied_at,\n    pl.do_not_contact,\n    pl.created_at,\n    pl.analyzed_at,\n    pl.demo_built_at,\n    pl.score_breakdown,\n    pp.name AS pool_name,\n    pp.source AS pool_source,\n    d.generation_status AS demo_status,\n    d.public_slug AS demo_slug\n   FROM prospect_leads pl\n     LEFT JOIN prospect_pools pp ON pl.pool_id = pp.id\n     LEFT JOIN demos d ON pl.demo_id = d.id;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_suggestion_counts","definition":" SELECT organization_id,\n    source_type,\n    count(*) FILTER (WHERE status = ''pending''::text) AS pending,\n    count(*) FILTER (WHERE status = ''approved''::text) AS approved,\n    count(*) FILTER (WHERE status = ''rejected''::text) AS rejected,\n    count(*) AS total\n   FROM ai_suggestions\n  GROUP BY organization_id, source_type;","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_upcoming_bookings","definition":" SELECT b.id,\n    b.organization_id,\n    b.host_user_id,\n    b.guest_name,\n    b.guest_email,\n    b.guest_company,\n    b.start_at,\n    b.end_at,\n    b.status,\n    b.meeting_url,\n    b.cancel_token,\n    b.reschedule_token,\n    et.name AS event_type_name,\n    et.duration_minutes,\n    et.color AS event_color,\n    et.icon AS event_icon,\n    bp.display_name AS host_name,\n    bp.slug AS page_slug,\n    p.full_name AS host_full_name,\n        CASE\n            WHEN b.start_at <= now() AND b.end_at > now() THEN ''nu_bezig''::text\n            WHEN b.start_at > now() AND b.start_at < (now() + ''01:00:00''::interval) THEN ''zo_dadelijk''::text\n            WHEN b.start_at::date = CURRENT_DATE THEN ''vandaag''::text\n            WHEN b.start_at::date = (CURRENT_DATE + 1) THEN ''morgen''::text\n            ELSE ''later''::text\n        END AS urgency\n   FROM bookings b\n     JOIN booking_event_types et ON b.event_type_id = et.id\n     JOIN booking_pages bp ON b.booking_page_id = bp.id\n     JOIN profiles p ON b.host_user_id = p.id\n  WHERE (b.status = ANY (ARRAY[''confirmed''::text, ''pending''::text])) AND b.start_at >= (now() - ''01:00:00''::interval);","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"},{"view":"v_upcoming_events","definition":" SELECT ce.id,\n    ce.organization_id,\n    ce.user_id,\n    ce.title,\n    ce.description,\n    ce.location,\n    ce.start_at,\n    ce.end_at,\n    ce.is_all_day,\n    ce.status,\n    ce.meeting_url,\n    ce.attendee_emails,\n    ce.matched_contact_ids,\n    ce.matched_company_ids,\n    p.full_name AS user_name,\n        CASE\n            WHEN ce.start_at >= now() AND ce.start_at < (now() + ''01:00:00''::interval) THEN ''starting_soon''::text\n            WHEN ce.start_at >= now() AND ce.start_at < (now() + ''24:00:00''::interval) THEN ''today''::text\n            WHEN ce.start_at >= now() AND ce.start_at < (now() + ''7 days''::interval) THEN ''this_week''::text\n            WHEN ce.start_at < now() AND ce.end_at > now() THEN ''in_progress''::text\n            ELSE ''later''::text\n        END AS urgency\n   FROM calendar_events ce\n     JOIN profiles p ON ce.user_id = p.id\n  WHERE ce.status <> ''cancelled''::text AND ce.start_at >= (now() - ''01:00:00''::interval);","acl":"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"}]'::jsonb) LOOP
 SELECT c.oid,c.relkind,c.reloptions,c.relacl::text AS acl,pg_get_userbyid(c.relowner) AS owner INTO current_view FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=expected->>'view';
 IF NOT FOUND OR current_view.relkind<>'v' OR current_view.owner<>'postgres' OR current_view.reloptions IS NOT NULL OR current_view.acl IS DISTINCT FROM expected->>'acl' OR pg_get_viewdef(current_view.oid,true) IS DISTINCT FROM expected->>'definition' THEN
  RAISE EXCEPTION 'ERP preflight drift for %: stop and refresh evidence',expected->>'view';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=current_view.oid AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL) THEN RAISE EXCEPTION 'Unexpected column ACL for %',expected->>'view'; END IF;
END LOOP;
END $erp_guard$;

CREATE OR REPLACE VIEW public.email_stats_by_org WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT organization_id,
    count(*) AS total,
    count(*) FILTER (WHERE status = ANY (ARRAY['sent'::text, 'delivered'::text, 'opened'::text, 'clicked'::text])) AS sent,
    count(*) FILTER (WHERE status = ANY (ARRAY['delivered'::text, 'opened'::text, 'clicked'::text])) AS delivered,
    count(*) FILTER (WHERE status = ANY (ARRAY['opened'::text, 'clicked'::text])) AS opened,
    count(*) FILTER (WHERE status = 'clicked'::text) AS clicked,
    count(*) FILTER (WHERE status = 'bounced'::text) AS bounced,
    count(*) FILTER (WHERE status = 'failed'::text) AS failed,
    COALESCE(sum(opened_count), 0::bigint)::integer AS total_opens,
    COALESCE(sum(clicked_count), 0::bigint)::integer AS total_clicks,
    max(sent_at) AS last_sent_at
   FROM email_sends
  GROUP BY organization_id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.email_stats_by_org FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.sdr_daily_stats WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT date_trunc('day'::text, created_at) AS day,
    count(*) FILTER (WHERE direction = 'outbound'::text) AS sent,
    count(*) FILTER (WHERE direction = 'inbound'::text) AS received,
    count(*) FILTER (WHERE classification = 'interested'::text) AS interested
   FROM outreach_messages
  GROUP BY (date_trunc('day'::text, created_at))
  ORDER BY (date_trunc('day'::text, created_at)) DESC
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (EXISTS (SELECT 1 FROM public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.sdr_daily_stats FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.sdr_pipeline WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT status,
    count(*) AS total,
    count(*) FILTER (WHERE relevance_score >= 7) AS high_score,
    avg(relevance_score)::numeric(3,1) AS avg_score
   FROM leads
  GROUP BY status
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (EXISTS (SELECT 1 FROM public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.sdr_pipeline FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_call_log WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT cl.id,
    cl.organization_id,
    cl.voys_call_id,
    cl.direction,
    cl.status,
    cl.caller_number,
    cl.caller_name,
    cl.caller_account_number,
    cl.caller_user_email,
    cl.destination_number,
    cl.destination_name,
    cl.destination_account_number,
    cl.destination_user_email,
    cl.started_at,
    cl.answered_at,
    cl.ended_at,
    cl.duration_seconds,
    cl.ring_duration_seconds,
    cl.has_recording,
    cl.recording_url,
    cl.recording_storage_path,
    cl.recording_duration_seconds,
    cl.has_transcription,
    cl.transcription_text,
    cl.transcription_summary,
    cl.transcription_language,
    cl.sentiment,
    cl.ai_summary,
    cl.ai_action_items,
    cl.matched_contact_id,
    cl.matched_company_id,
    cl.matched_project_id,
    cl.matched_user_id,
    cl.created_activity_id,
    cl.webhook_payloads,
    cl.tags,
    cl.notes,
    cl.created_at,
    cl.updated_at,
    (ct.first_name || ' '::text) || COALESCE(ct.last_name, ''::text) AS contact_name,
    co.name AS company_name,
    p.full_name AS user_name,
        CASE
            WHEN cl.duration_seconds IS NULL THEN '—'::text
            WHEN cl.duration_seconds < 60 THEN cl.duration_seconds || 's'::text
            ELSE (cl.duration_seconds / 60) || 'min'::text
        END AS duration_display,
        CASE cl.status
            WHEN 'ended'::text THEN 'Afgerond'::text
            WHEN 'missed'::text THEN 'Gemist'::text
            WHEN 'in_progress'::text THEN 'Bezig'::text
            WHEN 'ringing'::text THEN 'Rinkelt'::text
            ELSE cl.status
        END AS status_label
   FROM call_log cl
     LEFT JOIN contacts ct ON cl.matched_contact_id = ct.id
     LEFT JOIN companies co ON cl.matched_company_id = co.id
     LEFT JOIN profiles p ON cl.matched_user_id = p.id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_call_log FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_comments WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT c.id,
    c.organization_id,
    c.entity_type,
    c.entity_id,
    c.parent_id,
    c.user_id,
    c.content,
    c.is_edited,
    c.edited_at,
    c.mentions,
    c.created_at,
    p.full_name AS author_name,
    p.email AS author_email,
    ( SELECT count(*) AS count
           FROM comments r
          WHERE r.parent_id = c.id) AS reply_count
   FROM comments c
     JOIN profiles p ON c.user_id = p.id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_comments FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_company_email_stats WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT c.id AS company_id,
    c.organization_id,
    c.name AS company_name,
    count(ge.id) AS total_emails,
    count(ge.id) FILTER (WHERE ge.direction = 'inbound'::text) AS received,
    count(ge.id) FILTER (WHERE ge.direction = 'outbound'::text) AS sent,
    max(ge.received_at) AS last_email_at,
    count(ge.id) FILTER (WHERE ge.received_at > (now() - '7 days'::interval)) AS this_week,
    count(ge.id) FILTER (WHERE ge.category = 'support'::text) AS support_count
   FROM companies c
     LEFT JOIN google_emails ge ON ge.company_id = c.id
  GROUP BY c.id, c.organization_id, c.name
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_company_email_stats FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_company_health WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT id,
    organization_id,
    name,
    industry,
    city,
    kvk_number,
    last_activity_at,
    EXTRACT(day FROM now() - COALESCE(last_activity_at, created_at))::integer AS days_since_activity,
        CASE
            WHEN last_activity_at IS NULL THEN 'unknown'::text
            WHEN EXTRACT(day FROM now() - last_activity_at) <= 14::numeric THEN 'green'::text
            WHEN EXTRACT(day FROM now() - last_activity_at) <= 30::numeric THEN 'orange'::text
            ELSE 'red'::text
        END AS health_status,
    (( SELECT count(*) AS count
           FROM projects p
          WHERE p.company_id = c.id AND (p.status <> ALL (ARRAY['completed'::text, 'cancelled'::text]))))::integer AS active_projects,
    ( SELECT COALESCE(sum(s.monthly_amount), 0::numeric) AS "coalesce"
           FROM subscriptions s
             JOIN projects p ON s.project_id = p.id
          WHERE p.company_id = c.id AND s.status = 'active'::text) AS total_mrr,
    (( SELECT count(*) AS count
           FROM invoices i
             JOIN projects p ON i.project_id = p.id
          WHERE p.company_id = c.id AND (i.status = ANY (ARRAY['sent'::text, 'overdue'::text]))))::integer AS open_invoices
   FROM companies c
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_company_health FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_demos WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT d.id,
    d.organization_id,
    d.title,
    d.company_name,
    d.demo_type,
    d.is_public,
    d.public_slug,
    d.views,
    d.visitor_count,
    d.model_used,
    d.generation_status,
    d.generation_duration_seconds,
    d.is_multipage,
    d.branding,
    d.created_at,
    d.updated_at,
    d.company_id,
    d.deal_id,
    d.crawl_job_id,
    co.name AS linked_company_name,
    co.industry AS company_industry,
    ( SELECT count(*) AS count
           FROM demo_pages dp
          WHERE dp.demo_id = d.id AND dp.is_active = true) AS page_count,
    ( SELECT count(*) AS count
           FROM demo_feedback df
          WHERE df.demo_id = d.id) AS feedback_count,
    (ct.first_name || ' '::text) || COALESCE(ct.last_name, ''::text) AS contact_name,
    ct.email AS contact_email
   FROM demos d
     LEFT JOIN companies co ON d.company_id = co.id
     LEFT JOIN contacts ct ON d.contact_id = ct.id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_demos FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_email_drafts WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT es.id,
    es.organization_id,
    es.subject,
    es.html_content,
    es.to_address,
    es.status,
    es.trigger_event,
    es.step_number,
    es.created_at,
    es.ai_generated,
    es.merge_data,
    (ct.first_name || ' '::text) || COALESCE(ct.last_name, ''::text) AS contact_name,
    co.name AS company_name,
    p.name AS project_name,
    seq.name AS sequence_name,
        CASE es.trigger_event
            WHEN 'quote_sent'::text THEN 'Offerte follow-up'::text
            WHEN 'quote_no_response'::text THEN 'Offerte herinnering'::text
            WHEN 'project_delivered'::text THEN 'Oplevering feedback'::text
            WHEN 'booking_completed'::text THEN 'Meeting follow-up'::text
            WHEN 'contact_created'::text THEN 'Welkomstmail'::text
            WHEN 'client_inactive'::text THEN 'Reactivatie'::text
            WHEN 'invoice_overdue'::text THEN 'Betaalherinnering'::text
            WHEN 'manual'::text THEN 'Handmatig'::text
            ELSE es.trigger_event
        END AS trigger_label
   FROM email_sends es
     LEFT JOIN contacts ct ON es.contact_id = ct.id
     LEFT JOIN companies co ON es.company_id = co.id
     LEFT JOIN projects p ON es.project_id = p.id
     LEFT JOIN outreach_sequences seq ON es.sequence_id = seq.id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_email_drafts FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_email_threads WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT thread_id,
    organization_id,
    connection_id,
    min(received_at) AS started_at,
    max(received_at) AS last_message_at,
    count(*) AS message_count,
    (array_agg(subject ORDER BY received_at))[1] AS subject,
    (array_agg(contact_id ORDER BY received_at) FILTER (WHERE contact_id IS NOT NULL))[1] AS contact_id,
    (array_agg(company_id ORDER BY received_at) FILTER (WHERE company_id IS NOT NULL))[1] AS company_id,
    (array_agg(project_id ORDER BY received_at) FILTER (WHERE project_id IS NOT NULL))[1] AS project_id,
    (array_agg(category ORDER BY received_at) FILTER (WHERE category IS NOT NULL))[1] AS category,
    (array_agg(from_name ORDER BY received_at DESC))[1] AS last_sender,
    (array_agg(snippet ORDER BY received_at DESC))[1] AS last_snippet,
    bool_or(direction = 'inbound'::text AND is_read = false) AS has_unread
   FROM google_emails ge
  GROUP BY thread_id, organization_id, connection_id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_email_threads FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_klanten WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT c.id,
    c.organization_id,
    c.name,
    c.industry,
    c.city,
    c.website,
    c.phone,
    c.email,
    c.kvk_number,
    c.company_size,
    c.last_activity_at,
    c.primary_contact_id,
    pc.first_name AS contact_voornaam,
    pc.last_name AS contact_achternaam,
    (pc.first_name || ' '::text) || COALESCE(pc.last_name, ''::text) AS contact_naam,
    pc.email AS contact_email,
    pc.phone AS contact_telefoon,
    pc.job_title AS contact_functie,
    pc.temperature AS contact_temperatuur,
    pc.lead_score AS contact_score,
    ( SELECT count(*) AS count
           FROM contacts ct
          WHERE ct.company_id = c.id) AS aantal_contacten,
    ( SELECT count(*) AS count
           FROM projects p
          WHERE p.company_id = c.id AND (p.status = ANY (ARRAY['in_progress'::text, 'review'::text, 'accepted'::text, 'quoted'::text]))) AS actieve_projecten,
    ( SELECT count(*) AS count
           FROM projects p
          WHERE p.company_id = c.id) AS totaal_projecten,
    ( SELECT COALESCE(sum(s.monthly_amount), 0::numeric) AS "coalesce"
           FROM subscriptions s
             JOIN projects p ON s.project_id = p.id
          WHERE p.company_id = c.id AND s.status = 'active'::text) AS mrr,
    ( SELECT count(*) AS count
           FROM deals d
             JOIN pipeline_stages ps ON d.stage_id = ps.id
          WHERE d.company_id = c.id AND NOT COALESCE(ps.is_won, false) AND NOT COALESCE(ps.is_lost, false)) AS open_deals,
        CASE
            WHEN c.last_activity_at IS NULL THEN 'unknown'::text
            WHEN c.last_activity_at > (now() - '14 days'::interval) THEN 'green'::text
            WHEN c.last_activity_at > (now() - '30 days'::interval) THEN 'orange'::text
            ELSE 'red'::text
        END AS gezondheid,
        CASE
            WHEN c.last_activity_at IS NULL THEN NULL::integer
            ELSE EXTRACT(day FROM now() - c.last_activity_at)::integer
        END AS dagen_stil,
    ( SELECT a.subject
           FROM activities a
          WHERE a.company_id = c.id
          ORDER BY a.created_at DESC
         LIMIT 1) AS laatste_activiteit,
    ( SELECT count(*) AS count
           FROM google_emails ge
          WHERE ge.company_id = c.id AND ge.received_at > (now() - '30 days'::interval)) AS emails_30d,
    ( SELECT count(*) AS count
           FROM call_log cl
          WHERE cl.matched_company_id = c.id AND cl.started_at > (now() - '30 days'::interval)) AS calls_30d,
    c.created_at
   FROM companies c
     LEFT JOIN contacts pc ON c.primary_contact_id = pc.id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_klanten FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_my_tasks WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT t.id,
    t.organization_id,
    t.project_id,
    t.company_id,
    t.contact_id,
    t.deal_id,
    t.assigned_to,
    t.created_by,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.completed_at,
    t.completed_by,
    t.created_at,
    t.updated_at,
    p.name AS project_name,
    p.project_number,
    c.name AS company_name,
    prof.full_name AS assigned_to_name,
        CASE
            WHEN t.due_date < CURRENT_DATE AND (t.status <> ALL (ARRAY['done'::text, 'cancelled'::text])) THEN 'overdue'::text
            WHEN t.due_date = CURRENT_DATE THEN 'today'::text
            WHEN t.due_date = (CURRENT_DATE + 1) THEN 'tomorrow'::text
            WHEN t.due_date <= (CURRENT_DATE + 7) THEN 'this_week'::text
            ELSE 'later'::text
        END AS urgency
   FROM tasks t
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN companies c ON t.company_id = c.id
     LEFT JOIN profiles prof ON t.assigned_to = prof.id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_my_tasks FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_project_timeline WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT a.id,
    a.organization_id,
    a.project_id,
    'activity'::text AS source,
    a.activity_type AS event_type,
    a.subject AS title,
    a.description,
    a.user_id AS actor_id,
    a.created_at AS event_at,
    jsonb_build_object('status', a.status, 'priority', a.priority, 'outcome', a.outcome) AS metadata
   FROM activities a
  WHERE a.project_id IS NOT NULL
UNION ALL
 SELECT su.id,
    su.organization_id,
    su.project_id,
    'status_update'::text AS source,
    su.update_type AS event_type,
    su.title,
    su.message AS description,
    su.sent_by AS actor_id,
    su.created_at AS event_at,
    jsonb_build_object('is_sent', su.is_sent, 'sent_at', su.sent_at) AS metadata
   FROM project_status_updates su
UNION ALL
 SELECT i.id,
    i.organization_id,
    i.project_id,
    'invoice'::text AS source,
    i.status AS event_type,
    'Factuur '::text || i.invoice_number AS title,
    '€'::text || COALESCE(i.total_amount::text, '0'::text) AS description,
    NULL::uuid AS actor_id,
    i.created_at AS event_at,
    jsonb_build_object('total_amount', i.total_amount, 'due_date', i.due_date) AS metadata
   FROM invoices i
  WHERE i.project_id IS NOT NULL
UNION ALL
 SELECT ci.id,
    ci.organization_id,
    ci.project_id,
    'checklist'::text AS source,
    'completed'::text AS event_type,
    '✓ '::text || ci.title AS title,
    ci.description,
    ci.completed_by AS actor_id,
    ci.completed_at AS event_at,
    jsonb_build_object('is_required', ci.is_required) AS metadata
   FROM project_checklist_items ci
  WHERE ci.is_completed = true
UNION ALL
 SELECT cl.id,
    cl.organization_id,
    cl.matched_project_id AS project_id,
    'call'::text AS source,
    cl.direction AS event_type,
    ('📞 '::text ||
        CASE cl.direction
            WHEN 'inbound'::text THEN 'Inkomend: '::text
            ELSE 'Uitgaand: '::text
        END) || COALESCE(cl.caller_name, cl.caller_number) AS title,
        CASE
            WHEN cl.duration_seconds IS NOT NULL THEN (cl.duration_seconds / 60) || ' min'::text
            ELSE ''::text
        END AS description,
    cl.matched_user_id AS actor_id,
    COALESCE(cl.ended_at, cl.started_at) AS event_at,
    jsonb_build_object('has_recording', cl.has_recording, 'has_transcription', cl.has_transcription) AS metadata
   FROM call_log cl
  WHERE cl.matched_project_id IS NOT NULL AND (cl.status = ANY (ARRAY['ended'::text, 'missed'::text]))
UNION ALL
 SELECT ge.id,
    ge.organization_id,
    ge.project_id,
    'email'::text AS source,
    ge.direction AS event_type,
        CASE ge.direction
            WHEN 'inbound'::text THEN '📧 Van: '::text
            ELSE '📧 Naar: '::text
        END || COALESCE(ge.from_name, ge.from_email) AS title,
    ge.subject AS description,
    ge.user_id AS actor_id,
    ge.received_at AS event_at,
    jsonb_build_object('gmail_id', ge.gmail_message_id, 'thread_id', ge.thread_id, 'category', ge.category, 'snippet', ge.snippet) AS metadata
   FROM google_emails ge
  WHERE ge.project_id IS NOT NULL
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_project_timeline FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_prospect_leads WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT pl.id,
    pl.pool_id,
    pl.organization_id,
    pl.status,
    pl.company_name,
    pl.website_url,
    pl.city,
    pl.google_rating,
    pl.google_review_count,
    pl.score,
    pl.fit_summary,
    pl.contact_name,
    pl.contact_email,
    pl.contact_source,
    pl.demo_id,
    pl.demo_url,
    pl.demo_view_count,
    pl.demo_viewed_at,
    pl.email_subject,
    pl.email_sent_at,
    pl.email_opened_at,
    pl.email_replied_at,
    pl.do_not_contact,
    pl.created_at,
    pl.analyzed_at,
    pl.demo_built_at,
    pl.score_breakdown,
    pp.name AS pool_name,
    pp.source AS pool_source,
    d.generation_status AS demo_status,
    d.public_slug AS demo_slug
   FROM prospect_leads pl
     LEFT JOIN prospect_pools pp ON pl.pool_id = pp.id
     LEFT JOIN demos d ON pl.demo_id = d.id
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_prospect_leads FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_suggestion_counts WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT organization_id,
    source_type,
    count(*) FILTER (WHERE status = 'pending'::text) AS pending,
    count(*) FILTER (WHERE status = 'approved'::text) AS approved,
    count(*) FILTER (WHERE status = 'rejected'::text) AS rejected,
    count(*) AS total
   FROM ai_suggestions
  GROUP BY organization_id, source_type
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_suggestion_counts FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_upcoming_bookings WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT b.id,
    b.organization_id,
    b.host_user_id,
    b.guest_name,
    b.guest_email,
    b.guest_company,
    b.start_at,
    b.end_at,
    b.status,
    b.meeting_url,
    b.cancel_token,
    b.reschedule_token,
    et.name AS event_type_name,
    et.duration_minutes,
    et.color AS event_color,
    et.icon AS event_icon,
    bp.display_name AS host_name,
    bp.slug AS page_slug,
    p.full_name AS host_full_name,
        CASE
            WHEN b.start_at <= now() AND b.end_at > now() THEN 'nu_bezig'::text
            WHEN b.start_at > now() AND b.start_at < (now() + '01:00:00'::interval) THEN 'zo_dadelijk'::text
            WHEN b.start_at::date = CURRENT_DATE THEN 'vandaag'::text
            WHEN b.start_at::date = (CURRENT_DATE + 1) THEN 'morgen'::text
            ELSE 'later'::text
        END AS urgency
   FROM bookings b
     JOIN booking_event_types et ON b.event_type_id = et.id
     JOIN booking_pages bp ON b.booking_page_id = bp.id
     JOIN profiles p ON b.host_user_id = p.id
  WHERE (b.status = ANY (ARRAY['confirmed'::text, 'pending'::text])) AND b.start_at >= (now() - '01:00:00'::interval)
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_upcoming_bookings FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.v_upcoming_events WITH (security_invoker=true) AS
SELECT secured.*
FROM (
 SELECT ce.id,
    ce.organization_id,
    ce.user_id,
    ce.title,
    ce.description,
    ce.location,
    ce.start_at,
    ce.end_at,
    ce.is_all_day,
    ce.status,
    ce.meeting_url,
    ce.attendee_emails,
    ce.matched_contact_ids,
    ce.matched_company_ids,
    p.full_name AS user_name,
        CASE
            WHEN ce.start_at >= now() AND ce.start_at < (now() + '01:00:00'::interval) THEN 'starting_soon'::text
            WHEN ce.start_at >= now() AND ce.start_at < (now() + '24:00:00'::interval) THEN 'today'::text
            WHEN ce.start_at >= now() AND ce.start_at < (now() + '7 days'::interval) THEN 'this_week'::text
            WHEN ce.start_at < now() AND ce.end_at > now() THEN 'in_progress'::text
            ELSE 'later'::text
        END AS urgency
   FROM calendar_events ce
     JOIN profiles p ON ce.user_id = p.id
  WHERE ce.status <> 'cancelled'::text AND ce.start_at >= (now() - '01:00:00'::interval)
) AS secured
WHERE (CURRENT_USER IN ('postgres', 'service_role'))
   OR (secured.organization_id IN (SELECT public.user_organization_ids()));
REVOKE ALL PRIVILEGES ON TABLE public.v_upcoming_events FROM anon, PUBLIC;

DO $erp_verify$
DECLARE target text; target_oid oid; role_name text; privilege_name text;
BEGIN
FOREACH target IN ARRAY ARRAY['email_stats_by_org','sdr_daily_stats','sdr_pipeline','v_call_log','v_comments','v_company_email_stats','v_company_health','v_demos','v_email_drafts','v_email_threads','v_klanten','v_my_tasks','v_project_timeline','v_prospect_leads','v_suggestion_counts','v_upcoming_bookings','v_upcoming_events']::text[] LOOP
 target_oid=to_regclass('public.'||target);
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=target_oid AND reloptions @> ARRAY['security_invoker=true']) THEN RAISE EXCEPTION 'Missing invoker option: %',target; END IF;
 FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
  IF has_table_privilege('anon',target_oid,privilege_name) THEN RAISE EXCEPTION 'Anon still has % on %',privilege_name,target; END IF;
  FOREACH role_name IN ARRAY ARRAY['authenticated','service_role'] LOOP
   IF NOT has_table_privilege(role_name,target_oid,privilege_name) THEN RAISE EXCEPTION 'Lost existing % % privilege on %',role_name,privilege_name,target; END IF;
  END LOOP;
 END LOOP;
END LOOP;
END $erp_verify$;
COMMIT;

