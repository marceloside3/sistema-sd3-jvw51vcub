-- Add new audit event type for redistribution
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'project_redistribution_triggered';

-- Function to handle area changes and reset distribution
CREATE OR REPLACE FUNCTION public.handle_project_area_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_id uuid;
    v_project_name text;
    v_distributed_at timestamptz;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_project_id := OLD.project_id;
    ELSE
        v_project_id := NEW.project_id;
    END IF;

    SELECT name, distributed_at INTO v_project_name, v_distributed_at
    FROM public.projects
    WHERE id = v_project_id;

    IF NOT FOUND OR v_distributed_at IS NULL THEN
        IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    UPDATE public.projects
    SET distributed_at = NULL,
        g2_status = 'pending',
        g2_validated_at = NULL,
        updated_at = NOW()
    WHERE id = v_project_id;

    INSERT INTO public.project_audit_log (
        project_id,
        event_type,
        actor_user_id,
        field_name,
        old_value,
        new_value,
        metadata
    ) VALUES (
        v_project_id,
        'project_redistribution_triggered'::audit_event_type,
        auth.uid(),
        'distributed_at',
        v_distributed_at::text,
        NULL,
        jsonb_build_object('reason', 'Project areas modified after distribution', 'trigger_operation', TG_OP)
    );

    INSERT INTO public.notifications (user_id, type, title, message, link_to, is_read, should_send_email)
    SELECT DISTINCT u.user_id,
        'project_redistribution',
        'Distribuição Reaberta',
        'O projeto ' || v_project_name || ' teve suas áreas alteradas e a distribuição foi reaberta.',
        '/projetos/' || v_project_id,
        false,
        true
    FROM (
        SELECT to_user_id AS user_id FROM public.demands
        WHERE project_id = v_project_id AND to_user_id IS NOT NULL
        UNION
        SELECT ar.user_id FROM public.area_responsibles ar
        INNER JOIN public.project_areas pa ON pa.area_id = ar.area_id
        WHERE pa.project_id = v_project_id
    ) u
    WHERE u.user_id IS NOT NULL;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_area_change_reset ON public.project_areas;
CREATE TRIGGER trg_project_area_change_reset
    AFTER INSERT OR UPDATE OR DELETE ON public.project_areas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_project_area_change();
