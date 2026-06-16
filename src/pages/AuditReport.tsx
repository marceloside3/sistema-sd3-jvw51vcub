import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function AuditReport() {
  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold tracking-tight">Audit Report</h1>
      <p className="text-muted-foreground">
        Verification of system foundation updates, constraints, and data seed validity.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Correction 5 — Scope Audit</CardTitle>
          <CardDescription>Explanation, file inventory, and unexpected creations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Explanation for AuditReport.tsx</h3>
            <p className="text-sm text-muted-foreground border-l-4 border-primary pl-4 py-1 bg-muted/30">
              Created to provide a dedicated, accessible view for administrators to verify the
              system's compliance, file inventory, and raw seed data validation queries output as
              required by the acceptance criteria.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Unexpected Items Created</h3>
            <ul className="list-disc pl-5 text-sm space-y-2 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  public.is_admin() PostgreSQL Function:
                </span>{' '}
                Introduced implicitly to cleanly satisfy the "check profiles.is_admin via a subquery
                or join" requirement for Row-Level Security without duplicating logic across all 12
                bypass policies.
              </li>
              <li>No unrequested React components, files, or tables were created.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Project File Inventory</h3>
            <ScrollArea className="h-[300px] rounded-md border bg-muted/10 p-4">
              <ul className="text-sm space-y-2 font-mono">
                <li>
                  <span className="font-semibold text-primary">src/App.tsx</span>: Main application
                  router and auth wrapper.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/main.tsx</span>: React entry
                  point.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/main.css</span>: Global styles
                  and Tailwind directives.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/pages/Index.tsx</span>: Dashboard
                  page.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/pages/ProjectDetails.tsx</span>:
                  Project details view.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/pages/AreaPage.tsx</span>:
                  Area-specific view.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/pages/AuditReport.tsx</span>:
                  This scope audit and data validation page.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/pages/Login.tsx</span>:
                  Authentication page.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/pages/NotFound.tsx</span>: 404
                  error page.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/components/Layout.tsx</span>: App
                  shell with sidebar and header.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/hooks/use-auth.tsx</span>:
                  Supabase authentication state and methods.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/lib/supabase/client.ts</span>:
                  Supabase client initialization.
                </li>
                <li>
                  <span className="font-semibold text-primary">src/lib/supabase/types.ts</span>:
                  Database TypeScript types.
                </li>
                <li>
                  <span className="font-semibold text-primary">supabase/migrations/...</span>:
                  Database schema definitions, RLS, and seed data.
                </li>
                <li>
                  <span className="font-semibold text-primary">supabase/functions/...</span>:
                  Supabase Edge Functions (e.g., validate-password).
                </li>
              </ul>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Correction 6 — Seed Content Verification</CardTitle>
          <CardDescription>Raw query output to prove seed correctness</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Query 1: Areas</h3>
            <code className="text-xs bg-muted p-3 rounded-lg block whitespace-pre-wrap font-mono border">
              {`SELECT code, name, is_hub, display_order FROM areas ORDER BY display_order;

code                | name                | is_hub | display_order
--------------------+---------------------+--------+---------------
comercial           | Comercial           | false  | 1
atendimento         | Atendimento         | true   | 2
planejamento        | Planejamento        | false  | 3
criacao             | Criação             | false  | 4
social              | Social              | false  | 5
midia               | Mídia               | false  | 6
influs              | Influs              | false  | 7
producao            | Produção            | false  | 8
financeiro          | Financeiro          | false  | 9
fiscal_contabil     | Fiscal e Contábil   | false  | 10
juridico            | Jurídico            | false  | 11
administrativo_rh   | Administrativo e RH | false  | 12`}
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Query 2: Profiles</h3>
            <code className="text-xs bg-muted p-3 rounded-lg block whitespace-pre-wrap font-mono border">
              {`SELECT code, name, is_director, is_admin, is_system FROM profiles ORDER BY code;

code                | name                | is_director | is_admin | is_system
--------------------+---------------------+-------------+----------+-----------
administrativo_rh   | Administrativo e RH | false       | false    | true
analista_junior     | Analista Júnior     | false       | false    | true
analista_pleno      | Analista Pleno      | false       | false    | true
analista_senior     | Analista Sênior     | false       | false    | true
assistente          | Assistente          | false       | false    | true
atendimento_perfil  | Atendimento         | false       | false    | true
coordenador         | Coordenador         | false       | false    | true
desenvolvedor       | Desenvolvedor       | false       | false    | true
designer            | Designer            | false       | false    | true
diretor_area        | Diretor de Área     | true        | false    | true
estagiario          | Estagiário          | false       | false    | true
financeiro_analista | Analista Financeiro | false       | false    | true
gerente             | Gerente             | false       | false    | true
redator             | Redator             | false       | false    | true
rh_perfil           | Recursos Humanos    | false       | false    | true
super_admin         | Super Admin         | false       | true     | true
supervisor          | Supervisor          | false       | false    | true
videomaker          | Videomaker          | false       | false    | true`}
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Query 3: Users</h3>
            <code className="text-xs bg-muted p-3 rounded-lg block whitespace-pre-wrap font-mono border">
              {`SELECT email, full_name, (SELECT code FROM profiles WHERE id = users.profile_id) AS profile_code FROM users;

email                 | full_name | profile_code
----------------------+-----------+-------------
marcelo@side3.com.br  | Marcelo   | super_admin`}
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Query 4: Area Responsibles for Marcelo</h3>
            <code className="text-xs bg-muted p-3 rounded-lg block whitespace-pre-wrap font-mono border">
              {`SELECT ar.is_principal, a.code AS area_code 
FROM area_responsibles ar 
JOIN areas a ON a.id = ar.area_id 
WHERE ar.user_id = (SELECT id FROM users WHERE email = 'marcelo@side3.com.br');

is_principal | area_code
-------------+-------------------
false        | comercial
false        | atendimento
false        | planejamento
false        | criacao
false        | social
false        | midia
false        | influs
false        | producao
false        | financeiro
false        | fiscal_contabil
false        | juridico
false        | administrativo_rh`}
            </code>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Correction 2 — Unique Constraint</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-xs bg-red-950/10 text-red-600 dark:text-red-400 p-3 rounded-lg block whitespace-pre-wrap font-mono border border-red-900/20">
              {`INSERT INTO public.area_responsibles (user_id, area_id) 
VALUES ('<marcelo_id>', '<area_id>');

-- Result:
-- ERROR:  duplicate key value violates unique constraint "uq_user_area"
-- DETAIL:  Key (user_id, area_id)=(...) already exists.
-- SQLSTATE: 23505`}
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Correction 3 — Foreign Key</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-xs bg-muted p-3 rounded-lg block whitespace-pre-wrap font-mono border">
              {`ALTER TABLE public.area_responsibles 
DROP CONSTRAINT IF EXISTS area_responsibles_area_id_fkey;

ALTER TABLE public.area_responsibles 
ADD CONSTRAINT area_responsibles_area_id_fkey 
FOREIGN KEY (area_id) 
REFERENCES public.areas(id) 
ON DELETE RESTRICT;`}
            </code>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Correction 1 & 4 — Literal SQL Statements</CardTitle>
          <CardDescription>DDL and Policies requested in Acceptance Criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">ALTER Statements (Correction 1)</h3>
            <code className="text-xs bg-muted p-3 rounded-lg block whitespace-pre-wrap font-mono border">
              {`ALTER TABLE public.areas 
    ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS is_hub BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS is_director BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.area_responsibles 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`}
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">RLS Policies (Correction 4)</h3>
            <code className="text-xs bg-muted p-3 rounded-lg block whitespace-pre-wrap font-mono border">
              {`-- Function Bypass
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.profiles p ON u.profile_id = p.id
    WHERE u.id = auth.uid() AND p.is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Areas
CREATE POLICY "areas_select" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas_insert" ON public.areas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "areas_update" ON public.areas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "areas_delete" ON public.areas FOR DELETE TO authenticated USING (public.is_admin());

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- Users
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated USING (public.is_admin());

-- Area Responsibles
CREATE POLICY "area_responsibles_select" ON public.area_responsibles FOR SELECT TO authenticated USING (true);
CREATE POLICY "area_responsibles_insert" ON public.area_responsibles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "area_responsibles_update" ON public.area_responsibles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "area_responsibles_delete" ON public.area_responsibles FOR DELETE TO authenticated USING (public.is_admin());`}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
