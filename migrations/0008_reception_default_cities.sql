
DROP TRIGGER IF EXISTS reception_channel_allocate;
CREATE TRIGGER reception_channel_allocate AFTER INSERT ON reception_channel_assignments
WHEN EXISTS(SELECT 1 FROM reception_targets t WHERE t.enabled=1 AND t.channel=NEW.channel AND (NEW.routing_scope='global' OR COALESCE(json_array_length(t.data,'$.cities'),0)=0 OR EXISTS(SELECT 1 FROM json_each(t.data,'$.cities') c WHERE c.value=NEW.routing_city)))
BEGIN
 INSERT INTO reception_city_cursor(channel,city,ordinal) SELECT NEW.channel,NEW.routing_city,0 WHERE NEW.routing_scope='city' ON CONFLICT(channel,city) DO NOTHING;
 UPDATE reception_channel_assignments SET outcome='assigned',target_data=(SELECT t.data FROM reception_targets t WHERE t.enabled=1 AND t.channel=NEW.channel AND (NEW.routing_scope='global' OR COALESCE(json_array_length(t.data,'$.cities'),0)=0 OR EXISTS(SELECT 1 FROM json_each(t.data,'$.cities') c WHERE c.value=NEW.routing_city)) ORDER BY t.position,t.id LIMIT 1 OFFSET (SELECT CASE WHEN NEW.routing_scope='global' THEN (SELECT ordinal FROM reception_channel_cursor WHERE channel=NEW.channel) ELSE (SELECT ordinal FROM reception_city_cursor WHERE channel=NEW.channel AND city=NEW.routing_city) END % (SELECT COUNT(*) FROM reception_targets t WHERE t.enabled=1 AND t.channel=NEW.channel AND (NEW.routing_scope='global' OR COALESCE(json_array_length(t.data,'$.cities'),0)=0 OR EXISTS(SELECT 1 FROM json_each(t.data,'$.cities') c WHERE c.value=NEW.routing_city))))) WHERE id=NEW.id;
 UPDATE reception_channel_cursor SET ordinal=ordinal+1 WHERE channel=NEW.channel AND NEW.routing_scope='global';
 UPDATE reception_city_cursor SET ordinal=ordinal+1 WHERE channel=NEW.channel AND city=NEW.routing_city AND NEW.routing_scope='city';
END;
