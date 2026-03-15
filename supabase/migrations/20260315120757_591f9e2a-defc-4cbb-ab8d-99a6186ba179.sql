-- Drop and recreate to add connection_id column
DROP VIEW IF EXISTS public.v_email_threads;

CREATE VIEW public.v_email_threads AS
SELECT
    thread_id,
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
    bool_or(direction = 'inbound' AND is_read = false) AS has_unread
FROM google_emails ge
GROUP BY thread_id, organization_id, connection_id;