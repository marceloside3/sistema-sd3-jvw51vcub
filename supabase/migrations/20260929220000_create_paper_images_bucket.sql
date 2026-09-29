-- Migration: Criar bucket paper-images para imagens inline do Paper do Projeto
-- Permite que usuários autenticados façam upload de imagens inline e qualquer pessoa autenticada/pública leia as imagens

-- 1. Inserir bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'paper-images',
  'paper-images',
  true,
  20971520, -- 20MB por imagem
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- 2. Políticas de RLS em storage.objects para paper-images
DROP POLICY IF EXISTS "Public and authenticated can read paper images" ON storage.objects;
CREATE POLICY "Public and authenticated can read paper images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'paper-images');

DROP POLICY IF EXISTS "Authenticated users can upload paper images" ON storage.objects;
CREATE POLICY "Authenticated users can upload paper images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'paper-images'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can update paper images" ON storage.objects;
CREATE POLICY "Authenticated users can update paper images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'paper-images'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'paper-images'
  );

DROP POLICY IF EXISTS "Authenticated users can delete paper images" ON storage.objects;
CREATE POLICY "Authenticated users can delete paper images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'paper-images'
    AND auth.uid() IS NOT NULL
  );
