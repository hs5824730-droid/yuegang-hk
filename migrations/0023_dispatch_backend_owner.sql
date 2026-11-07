-- TG recipient selection also records CRM ownership; account permissions stay unchanged.
ALTER TABLE rental_registrations ADD COLUMN assigned_to TEXT REFERENCES users(id);
CREATE TRIGGER IF NOT EXISTS manual_dispatch_backend_selected AFTER UPDATE OF selected_at ON manual_lead_dispatch
WHEN OLD.selected_at IS NULL AND NEW.selected_at IS NOT NULL
 AND (SELECT COUNT(*) FROM users WHERE name=NEW.recipient)=1
BEGIN
 UPDATE leads SET assigned_to=(SELECT id FROM users WHERE name=NEW.recipient),
 status=CASE WHEN status='new' THEN 'contacted' ELSE status END
 WHERE (NEW.source='lead' AND id=NEW.source_id) OR (NEW.source='direct' AND id=(SELECT lead_id FROM reception_channel_assignments WHERE id=NEW.source_id));
 UPDATE customer_registrations SET assigned_to=(SELECT id FROM users WHERE name=NEW.recipient),
 status=CASE WHEN status='new' THEN 'contacted' ELSE status END,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE (NEW.source='lead' AND related_lead_id=NEW.source_id) OR (NEW.source='direct' AND related_lead_id=(SELECT lead_id FROM reception_channel_assignments WHERE id=NEW.source_id));
END;
CREATE TRIGGER IF NOT EXISTS registration_dispatch_backend_selected AFTER UPDATE OF selected_at ON registration_notifications
WHEN OLD.selected_at IS NULL AND NEW.selected_at IS NOT NULL
 AND (SELECT COUNT(*) FROM users WHERE name=NEW.recipient)=1
BEGIN
 UPDATE rental_registrations SET assigned_to=(SELECT id FROM users WHERE name=NEW.recipient),
 status=CASE WHEN status='new' THEN 'contacted' ELSE status END,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE NEW.source_type='rental' AND id=NEW.source_id;
 UPDATE customer_registrations SET assigned_to=(SELECT id FROM users WHERE name=NEW.recipient),
 status=CASE WHEN status='new' THEN 'contacted' ELSE status END,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE NEW.source_type='customer' AND id=NEW.source_id;
 UPDATE leads SET assigned_to=(SELECT id FROM users WHERE name=NEW.recipient),
 status=CASE WHEN status='new' THEN 'contacted' ELSE status END
 WHERE NEW.source_type='customer' AND id=(SELECT related_lead_id FROM customer_registrations WHERE id=NEW.source_id);
END;
