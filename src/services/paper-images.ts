import { supabase } from '@/lib/supabase/client'

/**
 * Faz upload de imagem inline do editor do Paper para o bucket 'paper-images' no Supabase Storage.
 * Retorna a URL pública direta da imagem para ser gravada no HTML do documento.
 * Se houver falha de rede/permissão, faz fallback convertendo para data-URI (base64)
 * para garantir que o usuário NUNCA perca a imagem inserida.
 */
export async function uploadPaperImage(file: File, projectId?: string): Promise<string> {
  // Se for maior que 20MB, rejeita
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('A imagem excede o limite máximo permitido de 20MB.')
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const path = `${projectId || 'general'}/${timestamp}_${randomSuffix}_${cleanName}`

  try {
    const { error: uploadError } = await supabase.storage.from('paper-images').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    })

    if (!uploadError) {
      const { data } = supabase.storage.from('paper-images').getPublicUrl(path)
      if (data?.publicUrl) {
        return data.publicUrl
      }
    }
    console.warn('Falha no upload do Supabase Storage, usando fallback base64:', uploadError)
  } catch (err) {
    console.warn('Exceção no upload para storage, usando fallback base64:', err)
  }

  // Fallback: ler como Data URL Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Erro ao processar imagem para formato base64.'))
      }
    }
    reader.onerror = () => reject(new Error('Erro na leitura do arquivo de imagem.'))
    reader.readAsDataURL(file)
  })
}
