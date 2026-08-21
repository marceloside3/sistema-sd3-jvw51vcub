-- Adds a SECURITY DEFINER RPC to send Criação-Kanban notifications to a creative on behalf
-- of the director. Bypasses notifications RLS (which restricts inserts to user_id = auth.uid())
-- because the director must notify a *different* user (the creative).
--
-- Transitions handled:
--   - 'assign'  : Diretor atribui demanda a um criativo (Fila do Diretor -> A Fazer)
--                 -> "Nova demanda atribuída a você: [título]"
--   - 'return'  : Diretor devolve peça para ajuste (Revisão Interna -> Em Criação)
--                 -> "Demanda devolvida para ajuste: [título] — Feedback: ..."
--
-- Idempotent: uses CREATE OR REPLACE FUNCTION.

CREATE OR REPLACE FUNCTION public.notify_criacao_transition(
  p_demand_id uuid,
  p_transition text,
  p_feedback text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_demand public.demands%ROWTYPE;
  v_recipient uuid;
  v_message text;
  v_notif_type text;
  v_title text;
BEGIN
  SELECT * INTO v_demand FROM public.demands WHERE id = p_demand_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Recipient is the assigned creative (to_user_id)
  v_recipient := v_demand.to_user_id;
  IF v_recipient IS NULL THEN
    RETURN;
  END IF;

  -- Avoid self-notification when the actor is the recipient
  IF p_actor_id IS NOT NULL AND v_recipient = p_actor_id THEN
    RETURN;
  END IF;

  IF p_transition = 'assign' THEN
    v_notif_type := 'demand_assigned_criacao';
    v_title := 'Nova demanda atribuída a você';
    v_message := 'Nova demanda atribuída a você: ' || v_demand.title;
  ELSIF p_transition = 'return' THEN
    v_notif_type := 'demand_returned_criacao';
    v_title := 'Demanda devolvida para ajuste';
    v_message := 'Demanda devolvida para ajuste: ' || v_demand.title;
    IF p_feedback IS NOT NULL AND btrim(p_feedback) <> '' THEN
      v_message := v_message || ' — Feedback: ' || btrim(p_feedback);
    END IF;
  ELSE
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link_to, is_read, should_send_email)
  VALUES (
    v_recipient,
    v_notif_type,
    v_title,
    v_message,
    '/demandas/' || v_demand.id,
    false,
    false
  );
END;
$$;

-- Allow any authenticated user to call it (the function is SECURITY DEFINER so it runs as owner)
REVOKE ALL ON FUNCTION public.notify_criacao_transition(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_criacao_transition(uuid, text, text, uuid) TO authenticated;
