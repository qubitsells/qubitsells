-- Future inbox notifications queue one email each. Do not backfill old activity.
-- Store only a reference: deleting a notification/account removes its delivery.
CREATE TABLE public.notification_email_outbox (
  notification_id uuid PRIMARY KEY REFERENCES public.store_notifications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','sent','skipped','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 6),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  locked_until timestamptz,
  sent_at timestamptz,
  last_error text CHECK (last_error IN ('smtp_failed','lookup_failed','recipient_unavailable','preferences_disabled','superseded','invalid_notification','lease_expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_email_due ON public.notification_email_outbox(next_attempt_at,notification_id) WHERE status='queued';
CREATE INDEX notification_email_leases ON public.notification_email_outbox(locked_until) WHERE status='processing';
ALTER TABLE public.notification_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_email_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.notification_email_outbox TO service_role;

CREATE FUNCTION private.qubit_queue_notification_email() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  INSERT INTO public.notification_email_outbox(notification_id) VALUES(NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.qubit_queue_notification_email() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.qubit_queue_notification_email() TO service_role;
CREATE TRIGGER qubit_notification_email AFTER INSERT ON public.store_notifications
FOR EACH ROW EXECUTE FUNCTION private.qubit_queue_notification_email();

CREATE FUNCTION public.qubit_claim_notification_emails(p_limit integer DEFAULT 4)
RETURNS TABLE(notification_id uuid,lease_token uuid,user_id uuid,kind text,title text,message text,href text,dedupe_key text,calendar_couple_id uuid,read_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  UPDATE public.notification_email_outbox q SET status='failed',lease_token=NULL,locked_until=NULL,last_error='lease_expired'
  WHERE q.status='processing' AND q.locked_until<=now() AND q.attempts>=6;
  RETURN QUERY
  WITH candidates AS (
    SELECT q.notification_id FROM public.notification_email_outbox q
    WHERE q.attempts<6 AND ((q.status='queued' AND q.next_attempt_at<=now()) OR (q.status='processing' AND q.locked_until<=now()))
    ORDER BY q.next_attempt_at,q.notification_id LIMIT greatest(1,least(coalesce(p_limit,4),20)) FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.notification_email_outbox q SET status='processing',attempts=q.attempts+1,lease_token=gen_random_uuid(),locked_until=now()+interval '5 minutes'
    FROM candidates c WHERE q.notification_id=c.notification_id RETURNING q.notification_id,q.lease_token
  ) SELECT c.notification_id,c.lease_token,n.user_id,n.kind,n.title,n.message,n.href,n.dedupe_key,n.calendar_couple_id,n.read_at
    FROM claimed c JOIN public.store_notifications n ON n.id=c.notification_id;
END $$;
REVOKE ALL ON FUNCTION public.qubit_claim_notification_emails(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_claim_notification_emails(integer) TO service_role;

CREATE FUNCTION public.qubit_finish_notification_email(p_notification_id uuid,p_lease_token uuid,p_outcome text,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE changed integer;
BEGIN
  IF p_outcome NOT IN ('sent','retry','skipped') THEN RAISE EXCEPTION 'Invalid email outcome' USING ERRCODE='22023'; END IF;
  UPDATE public.notification_email_outbox q SET
    status=CASE WHEN p_outcome='retry' THEN CASE WHEN q.attempts>=6 THEN 'failed' ELSE 'queued' END ELSE p_outcome END,
    sent_at=CASE WHEN p_outcome='sent' THEN now() ELSE NULL END,
    next_attempt_at=CASE WHEN p_outcome='retry' THEN now()+make_interval(secs=>least(21600,60*power(2,q.attempts))::integer) ELSE q.next_attempt_at END,
    lease_token=NULL,locked_until=NULL,last_error=p_error
  WHERE q.notification_id=p_notification_id AND q.status='processing' AND q.lease_token=p_lease_token;
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION public.qubit_finish_notification_email(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_finish_notification_email(uuid,uuid,text,text) TO service_role;
