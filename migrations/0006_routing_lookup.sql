CREATE INDEX IF NOT EXISTS reception_assignment_lead ON reception_channel_assignments(lead_id,channel,created_at DESC,id);
