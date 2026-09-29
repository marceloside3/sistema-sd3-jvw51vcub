-- Migration: Limpeza completa de todos os projetos, demandas e dependências
-- Autorizado por Marcelo: "pode apagar"
-- Execução segura: desabilita triggers de usuário durante a operação para evitar
-- efeitos colaterais de auditoria ou cascata inválida.

DO $$
BEGIN
  -- 1. Desabilitar triggers das tabelas envolvidas
  ALTER TABLE public.handover_meeting_participants DISABLE TRIGGER USER;
  ALTER TABLE public.handover_meetings DISABLE TRIGGER USER;
  ALTER TABLE public.paper_g3_reviews DISABLE TRIGGER USER;
  ALTER TABLE public.project_papers DISABLE TRIGGER USER;
  ALTER TABLE public.project_attachments DISABLE TRIGGER USER;
  ALTER TABLE public.project_areas DISABLE TRIGGER USER;
  ALTER TABLE public.project_audit_log DISABLE TRIGGER USER;
  ALTER TABLE public.finance_requests DISABLE TRIGGER USER;
  ALTER TABLE public.demand_audit_log DISABLE TRIGGER USER;
  ALTER TABLE public.demand_comments DISABLE TRIGGER USER;
  ALTER TABLE public.demand_attachments DISABLE TRIGGER USER;
  ALTER TABLE public.demand_assignments DISABLE TRIGGER USER;
  ALTER TABLE public.demand_items DISABLE TRIGGER USER;
  ALTER TABLE public.demands DISABLE TRIGGER USER;
  ALTER TABLE public.projects DISABLE TRIGGER USER;
  ALTER TABLE public.notifications DISABLE TRIGGER USER;

  -- 2. Limpar notificações vinculadas a projetos e demandas
  DELETE FROM public.notifications
  WHERE link_to LIKE '%/projetos%' OR link_to LIKE '%/demandas%';

  -- 3. Limpeza ordenada das tabelas filhas de demandas
  DELETE FROM public.finance_requests;
  DELETE FROM public.demand_audit_log;
  DELETE FROM public.demand_assignments;
  DELETE FROM public.demand_comments;
  DELETE FROM public.demand_attachments;
  DELETE FROM public.demand_items;
  DELETE FROM public.demands;

  -- 4. Limpeza ordenada das tabelas filhas de projetos
  DELETE FROM public.handover_meeting_participants;
  DELETE FROM public.handover_meetings;
  DELETE FROM public.paper_g3_reviews;
  DELETE FROM public.project_papers;
  DELETE FROM public.project_attachments;
  DELETE FROM public.project_areas;
  DELETE FROM public.project_audit_log;

  -- 5. Exclusão de todos os projetos
  DELETE FROM public.projects;

  -- 6. Reabilitar todos os triggers de usuário
  ALTER TABLE public.notifications ENABLE TRIGGER USER;
  ALTER TABLE public.projects ENABLE TRIGGER USER;
  ALTER TABLE public.demands ENABLE TRIGGER USER;
  ALTER TABLE public.demand_items ENABLE TRIGGER USER;
  ALTER TABLE public.demand_assignments ENABLE TRIGGER USER;
  ALTER TABLE public.demand_attachments ENABLE TRIGGER USER;
  ALTER TABLE public.demand_comments ENABLE TRIGGER USER;
  ALTER TABLE public.demand_audit_log ENABLE TRIGGER USER;
  ALTER TABLE public.finance_requests ENABLE TRIGGER USER;
  ALTER TABLE public.project_audit_log ENABLE TRIGGER USER;
  ALTER TABLE public.project_areas ENABLE TRIGGER USER;
  ALTER TABLE public.project_attachments ENABLE TRIGGER USER;
  ALTER TABLE public.project_papers ENABLE TRIGGER USER;
  ALTER TABLE public.paper_g3_reviews ENABLE TRIGGER USER;
  ALTER TABLE public.handover_meetings ENABLE TRIGGER USER;
  ALTER TABLE public.handover_meeting_participants ENABLE TRIGGER USER;
END $$;
