-- Add budget_status and payment_status columns to demands table
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS budget_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (budget_status IN ('pending', 'sent', 'approved', 'rejected', 'adjustments_requested'));
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'none'
  CHECK (payment_status IN ('none', 'requested', 'processed'));

-- Trigger function for budget and payment status change notifications
CREATE OR REPLACE FUNCTION public.notify_budget_payment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_financeiro_area_id uuid;
  v_user_id uuid;
BEGIN
  -- Budget status changed
  IF OLD.budget_status IS DISTINCT FROM NEW.budget_status THEN
    -- Budget sent: notify the solicitor (from_user_id)
    IF NEW.budget_status = 'sent' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link_to, should_send_email)
      VALUES (
        NEW.from_user_id,
        'budget_sent',
        'Orçamento Enviado',
        'O orçamento da demanda ' || NEW.title || ' foi enviado para sua aprovação.',
        '/demandas/' || NEW.id,
        false
      );
    END IF;

    -- Approved, rejected, or adjustments requested: notify the production team (to_area_id)
    IF NEW.budget_status IN ('approved', 'rejected', 'adjustments_requested') THEN
      FOR v_user_id IN
        SELECT user_id FROM public.area_responsibles WHERE area_id = NEW.to_area_id
      LOOP
        INSERT INTO public.notifications (user_id, type, title, message, link_to, should_send_email)
        VALUES (
          v_user_id,
          'budget_' || NEW.budget_status,
          CASE NEW.budget_status
            WHEN 'approved' THEN 'Orçamento Aprovado'
            WHEN 'rejected' THEN 'Orçamento Reprovado'
            WHEN 'adjustments_requested' THEN 'Ajustes Solicitados'
          END,
          CASE NEW.budget_status
            WHEN 'approved' THEN 'O orçamento da demanda ' || NEW.title || ' foi aprovado e aguarda envio ao financeiro.'
            WHEN 'rejected' THEN 'O orçamento da demanda ' || NEW.title || ' foi reprovado pelo solicitante.'
            WHEN 'adjustments_requested' THEN 'O solicitante pediu ajustes no orçamento da demanda ' || NEW.title || '.'
          END,
          '/demandas/' || NEW.id,
          false
        );
      END LOOP;
    END IF;
  END IF;

  -- Payment status changed
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    IF NEW.payment_status = 'requested' THEN
      SELECT id INTO v_financeiro_area_id FROM public.areas WHERE name = 'Financeiro' LIMIT 1;
      IF v_financeiro_area_id IS NOT NULL THEN
        FOR v_user_id IN
          SELECT user_id FROM public.area_responsibles WHERE area_id = v_financeiro_area_id
        LOOP
          INSERT INTO public.notifications (user_id, type, title, message, link_to, should_send_email)
          VALUES (
            v_user_id,
            'payment_requested',
            'Solicitação de Pagamento',
            'A demanda ' || NEW.title || ' teve o orçamento aprovado e aguarda processamento de pagamento.',
            '/demandas/' || NEW.id,
            false
          );
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create AFTER UPDATE trigger for budget/payment notifications
DROP TRIGGER IF EXISTS trigger_notify_budget_payment ON public.demands;
CREATE TRIGGER trigger_notify_budget_payment
  AFTER UPDATE ON public.demands
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_budget_payment_changes();
