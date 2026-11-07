CREATE TABLE IF NOT EXISTS reception_settings(key TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO reception_settings(key,data,version,updated_at) VALUES('whatsapp_prefill','{"zh":"你好，我通過悦港 Harbour Joy 網站查詢。我想了解{房屋地區}嘅{服務類型}，請同我聯絡。","en":"Hello, I found Harbour Joy online. I would like to discuss {service} in {city}. Please contact me."}',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
ALTER TABLE reception_channel_assignments ADD COLUMN whatsapp_text TEXT;
ALTER TABLE reception_channel_assignments ADD COLUMN whatsapp_template_version INTEGER;

DROP TRIGGER IF EXISTS reception_channel_allocate;
CREATE TRIGGER reception_channel_allocate AFTER INSERT ON reception_channel_assignments
WHEN EXISTS(SELECT 1 FROM reception_targets t WHERE t.enabled=1 AND t.channel=NEW.channel AND (NEW.routing_scope='global' OR COALESCE(json_array_length(t.data,'$.cities'),0)=0 OR EXISTS(SELECT 1 FROM json_each(t.data,'$.cities') c WHERE c.value=NEW.routing_city)))
BEGIN
 INSERT INTO reception_city_cursor(channel,city,ordinal) SELECT NEW.channel,NEW.routing_city,0 WHERE NEW.routing_scope='city' ON CONFLICT(channel,city) DO NOTHING;
 UPDATE reception_channel_assignments SET outcome='assigned',target_data=(SELECT CASE WHEN NEW.channel='whatsapp' THEN json_set(t.data,'$.prefillText',NEW.whatsapp_text,'$.templateVersion',NEW.whatsapp_template_version) ELSE t.data END FROM reception_targets t WHERE t.enabled=1 AND t.channel=NEW.channel AND (NEW.routing_scope='global' OR COALESCE(json_array_length(t.data,'$.cities'),0)=0 OR EXISTS(SELECT 1 FROM json_each(t.data,'$.cities') c WHERE c.value=NEW.routing_city)) ORDER BY t.position,t.id LIMIT 1 OFFSET (SELECT CASE WHEN NEW.routing_scope='global' THEN (SELECT ordinal FROM reception_channel_cursor WHERE channel=NEW.channel) ELSE (SELECT ordinal FROM reception_city_cursor WHERE channel=NEW.channel AND city=NEW.routing_city) END % (SELECT COUNT(*) FROM reception_targets t WHERE t.enabled=1 AND t.channel=NEW.channel AND (NEW.routing_scope='global' OR COALESCE(json_array_length(t.data,'$.cities'),0)=0 OR EXISTS(SELECT 1 FROM json_each(t.data,'$.cities') c WHERE c.value=NEW.routing_city))))) WHERE id=NEW.id;
 UPDATE reception_channel_cursor SET ordinal=ordinal+1 WHERE channel=NEW.channel AND NEW.routing_scope='global';
 UPDATE reception_city_cursor SET ordinal=ordinal+1 WHERE channel=NEW.channel AND city=NEW.routing_city AND NEW.routing_scope='city';
END;
