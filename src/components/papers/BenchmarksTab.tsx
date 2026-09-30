import { useCallback, useEffect, useState } from 'react'
import {
  ArrowUpRight,
  ExternalLink,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'

interface SourceLink {
  title: string
  url: string
}
interface GroundedImage {
  title: string
  imageUrl: string
  sourceUrl: string
  domain: string
}
interface InternalMatch {
  projectId: string
  projectName: string
  projectCode: string | null
  endDate: string | null
  matchTerms: string[]
  evidence: string
}
interface BenchmarkResult {
  groundedText: string
  sources: SourceLink[]
  imageReferences: GroundedImage[]
  searchSuggestionHtml: string
  imageSearchSuggestionHtml: string
  internalMatches: InternalMatch[]
  analyzedAt: string
  model: string
}
interface GeneratedConcept {
  base64: string
  mimeType: string
  dataUrl: string
}
interface BenchmarksTabProps {
  project: any
  paper: any
  readOnly?: boolean
  canEdit?: boolean
  onReload: () => void
}

const MAX_CONCEPT_IMAGES_PER_RESEARCH = 2
const MAX_RESULT_BYTES = 180_000

function safeText(value: unknown, maxLength = 1200): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}
function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}
function normalizeSources(value: unknown): SourceLink[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>(),
    result: SourceLink[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const url = safeHttpsUrl((item as any).url),
      title = safeText((item as any).title, 180)
    if (!url || !title || seen.has(url)) continue
    seen.add(url)
    result.push({ title, url })
    if (result.length >= 15) break
  }
  return result
}
function validateResult(value: unknown): BenchmarkResult {
  if (!value || typeof value !== 'object')
    throw new Error('Resposta inválida da pesquisa de benchmarks.')
  const source = value as Record<string, any>
  const searchSuggestionHtml = safeText(source.searchSuggestionHtml, 50000)
  const imageSearchSuggestionHtml = safeText(source.imageSearchSuggestionHtml, 50000)
  const imageReferences: GroundedImage[] =
    imageSearchSuggestionHtml && Array.isArray(source.imageReferences)
      ? source.imageReferences.slice(0, 6).flatMap((item: any) => {
          const imageUrl = safeHttpsUrl(item?.imageUrl),
            sourceUrl = safeHttpsUrl(item?.sourceUrl),
            title = safeText(item?.title, 180)
          if (!imageUrl || !sourceUrl || !title) return []
          return [{ title, imageUrl, sourceUrl, domain: safeText(item?.domain, 120) }]
        })
      : []
  const internalMatches: InternalMatch[] = Array.isArray(source.internalMatches)
    ? source.internalMatches
        .slice(0, 4)
        .filter((item: any) => item && typeof item.projectId === 'string')
        .map((item: any) => ({
          projectId: safeText(item.projectId, 60),
          projectName: safeText(item.projectName, 180),
          projectCode: safeText(item.projectCode, 60) || null,
          endDate: safeText(item.endDate, 40) || null,
          matchTerms: Array.isArray(item.matchTerms)
            ? item.matchTerms
                .filter((v: unknown) => typeof v === 'string')
                .slice(0, 6)
                .map((v: string) => safeText(v, 70))
            : [],
          evidence: safeText(item.evidence, 250),
        }))
    : []
  const result: BenchmarkResult = {
    // Do not parse, rewrite, cache, or persist text derived from Google Search grounding.
    groundedText: typeof source.groundedText === 'string' ? source.groundedText : '',
    sources: normalizeSources(source.sources),
    imageReferences,
    searchSuggestionHtml,
    imageSearchSuggestionHtml,
    internalMatches,
    analyzedAt: safeText(source.analyzedAt, 80),
    model: safeText(source.model, 100),
  }
  if (!result.groundedText || !searchSuggestionHtml)
    throw new Error('A pesquisa web não retornou conteúdo e sugestão oficiais do Google.')
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_RESULT_BYTES)
    throw new Error(
      'O resultado excedeu o limite da sessão. Atualize a pesquisa para tentar novamente.',
    )
  return result
}
function formatDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('pt-BR')
}
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char,
  )
}
function internalPaperHtml(item: InternalMatch): string {
  const url = `/projetos/${encodeURIComponent(item.projectId)}/paper`
  return `<h3>Projeto interno semelhante — ${escapeHtml(item.projectName)}</h3><p>${escapeHtml(item.projectCode || 'Projeto concluído')}${formatDate(item.endDate) ? ` • concluído em ${escapeHtml(formatDate(item.endDate)!)}` : ''}</p><p><strong>Termos em comum:</strong> ${item.matchTerms.map(escapeHtml).join(', ')}</p><p>${escapeHtml(item.evidence)}</p><p><a href="${url}" target="_blank" rel="noopener noreferrer">Abrir Paper relacionado</a></p>`
}

export function BenchmarksTab({ project, paper, readOnly, canEdit, onReload }: BenchmarksTabProps) {
  const { toast } = useToast()
  // Grounded response/suggestions are ephemeral React state only: not saved or cached.
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [visualDirection, setVisualDirection] = useState('')
  const [generatedConcept, setGeneratedConcept] = useState<GeneratedConcept | null>(null)
  const [busy, setBusy] = useState<'analyze' | 'save' | 'image' | null>(null)
  const [conceptImagesGenerated, setConceptImagesGenerated] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [paperState, setPaperState] = useState(paper)
  const isReadOnly = Boolean(
    readOnly || !paperState || paperState?.status !== 'draft' || canEdit === false,
  )

  useEffect(() => {
    setPaperState(paper)
    setResult(null)
    setGeneratedConcept(null)
    setVisualDirection('')
    setErrorMessage('')
    setConceptImagesGenerated(0)
  }, [project?.id, paper?.id])

  const runAnalysis = useCallback(async () => {
    if (!project?.id || !paperState?.id || isReadOnly) return
    setBusy('analyze')
    setErrorMessage('')
    setResult(null)
    setGeneratedConcept(null)
    setConceptImagesGenerated(0)
    try {
      const { data: sessionResult } = await supabase.auth.getSession(),
        token = sessionResult.session?.access_token
      if (!token) throw new Error('Sessão não encontrada. Faça login novamente.')
      const { data, error } = await supabase.functions.invoke('analyze-paper-benchmarks', {
        body: { projectId: project.id, paperId: paperState.id },
        headers: { Authorization: `Bearer ${token}` },
      })
      if (error) {
        let message = error.message || 'Falha na pesquisa Gemini.'
        try {
          const body =
            typeof (error as any).context?.json === 'function'
              ? await (error as any).context.json()
              : null
          if (body?.error) message = body.error
        } catch {
          /* keep SDK message */
        }
        throw new Error(message)
      }
      if (!data?.success || !data?.data)
        throw new Error(data?.error || 'Resposta inesperada da pesquisa de benchmarks.')
      setResult(validateResult(data.data))
    } catch (error: any) {
      setErrorMessage(error.message || 'Não foi possível analisar este briefing.')
      toast({
        title: 'Falha na análise',
        description: error.message || 'Não foi possível pesquisar o benchmark.',
        variant: 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }, [project?.id, paperState?.id, isReadOnly, toast])

  const copyGroundedText = useCallback(async () => {
    if (!result?.groundedText) return
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('A área de transferência não está disponível neste navegador.')
      await navigator.clipboard.writeText(result.groundedText)
      toast({
        title: 'Resultado copiado',
        description:
          'Texto copiado por sua solicitação. Cole manualmente em seu documento, se desejar.',
      })
    } catch (error: any) {
      toast({
        title: 'Não foi possível copiar',
        description: error.message || 'Selecione o texto e copie manualmente.',
        variant: 'destructive',
      })
    }
  }, [result?.groundedText, toast])

  const copyImageReference = useCallback(
    async (image: GroundedImage) => {
      try {
        if (!navigator.clipboard?.writeText)
          throw new Error('A área de transferência não está disponível neste navegador.')
        await navigator.clipboard.writeText(
          `Imagem de referência: ${image.title}\nPágina de origem e atribuição: ${image.sourceUrl}`,
        )
        toast({
          title: 'Atribuição copiada',
          description: 'Link da página de origem copiado; a imagem continua vinculada à sua fonte.',
        })
      } catch (error: any) {
        toast({
          title: 'Não foi possível copiar',
          description: error.message || 'Abra o link da fonte para consultá-lo.',
          variant: 'destructive',
        })
      }
    },
    [toast],
  )

  const appendInternalMatch = useCallback(
    async (item: InternalMatch) => {
      if (!paperState?.id || isReadOnly) return
      setBusy('save')
      try {
        const { data: latest, error: readError } = await supabase
          .from('project_papers')
          .select('refined_objective')
          .eq('id', paperState.id)
          .single()
        if (readError) throw readError
        const current =
          typeof latest?.refined_objective === 'string' ? latest.refined_objective.trim() : ''
        const section = `<hr /><section><p><strong>Projeto interno concluído adicionado manualmente</strong></p>${internalPaperHtml(item)}</section>`
        const { data, error } = await supabase
          .from('project_papers')
          .update({
            refined_objective: current ? `${current}${section}` : section,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paperState.id)
          .select('id, refined_objective, updated_at')
          .single()
        if (error) throw error
        setPaperState((previous: any) => ({ ...previous, ...data }))
        onReload()
        toast({
          title: 'Projeto incluído',
          description: 'A referência interna foi adicionada ao documento do Paper.',
        })
      } catch (error: any) {
        toast({
          title: 'Falha ao incluir',
          description: error.message || 'Não foi possível adicionar o projeto.',
          variant: 'destructive',
        })
      } finally {
        setBusy(null)
      }
    },
    [paperState?.id, isReadOnly, onReload, toast],
  )

  const generateConceptImage = useCallback(async () => {
    if (!project?.id || !paperState?.id || isReadOnly) return
    if (conceptImagesGenerated >= MAX_CONCEPT_IMAGES_PER_RESEARCH) {
      toast({
        title: 'Limite desta pesquisa',
        description: `Até ${MAX_CONCEPT_IMAGES_PER_RESEARCH} moodboards por pesquisa. Atualize para reiniciar o limite.`,
      })
      return
    }
    const direction = visualDirection.trim()
    if (direction.length < 20) {
      toast({
        title: 'Descreva a direção visual',
        description: 'Use pelo menos 20 caracteres e não inclua dados pessoais.',
      })
      return
    }
    setBusy('image')
    setConceptImagesGenerated((count) => count + 1)
    try {
      const { data: sessionResult } = await supabase.auth.getSession(),
        token = sessionResult.session?.access_token
      if (!token) throw new Error('Sessão não encontrada. Faça login novamente.')
      const { data, error } = await supabase.functions.invoke('analyze-paper-benchmarks', {
        body: {
          action: 'generate_concept',
          projectId: project.id,
          paperId: paperState.id,
          visualDirection: direction,
        },
        headers: { Authorization: `Bearer ${token}` },
      })
      if (error) {
        let message = error.message || 'Falha ao gerar o conceito visual.'
        try {
          const body =
            typeof (error as any).context?.json === 'function'
              ? await (error as any).context.json()
              : null
          if (body?.error) message = body.error
        } catch {
          /* keep SDK message */
        }
        throw new Error(message)
      }
      const base64 = data?.data?.imageDataBase64,
        mimeType = data?.data?.mimeType
      if (typeof base64 !== 'string' || !/^image\/(png|jpeg|webp)$/i.test(mimeType || ''))
        throw new Error('Resposta de imagem inválida.')
      setGeneratedConcept({ base64, mimeType, dataUrl: `data:${mimeType};base64,${base64}` })
      toast({
        title: 'Moodboard gerado',
        description:
          'Imagem-conceito temporária nesta sessão; adicione-a manualmente ao Paper se quiser mantê-la.',
      })
    } catch (error: any) {
      setConceptImagesGenerated((count) => Math.max(0, count - 1))
      toast({
        title: 'Não foi possível gerar a imagem',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }, [project?.id, paperState?.id, isReadOnly, visualDirection, conceptImagesGenerated, toast])

  const addGeneratedImageToPaper = useCallback(async () => {
    if (!generatedConcept || !paperState?.id || isReadOnly) return
    setBusy('save')
    try {
      const binary = atob(generatedConcept.base64),
        bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      const extension =
        generatedConcept.mimeType === 'image/png'
          ? 'png'
          : generatedConcept.mimeType === 'image/webp'
            ? 'webp'
            : 'jpg'
      const file = new File([bytes], `benchmark-conceito-${Date.now()}.${extension}`, {
        type: generatedConcept.mimeType,
      })
      const path = `${project.id}/benchmarks/${paperState.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('paper-images')
        .upload(path, file, {
          contentType: generatedConcept.mimeType,
          cacheControl: '31536000',
          upsert: false,
        })
      if (uploadError)
        throw new Error(`A imagem gerada não pôde ser armazenada: ${uploadError.message}`)
      const { data: publicUrl } = supabase.storage.from('paper-images').getPublicUrl(path)
      const html = `<hr /><section><h3>Moodboard conceitual gerado por IA</h3><p><strong>Imagem original de IA; não é foto nem peça de campanha executada.</strong></p><p>${escapeHtml(visualDirection)}</p><figure><img src="${escapeHtml(publicUrl.publicUrl)}" alt="Moodboard conceitual gerado por IA" /><figcaption>Conceito visual gerado pelo Gemini para exploração criativa.</figcaption></figure></section>`
      const { data: latest, error: readError } = await supabase
        .from('project_papers')
        .select('refined_objective')
        .eq('id', paperState.id)
        .single()
      if (readError) throw readError
      const current =
        typeof latest?.refined_objective === 'string' ? latest.refined_objective.trim() : ''
      const { data, error } = await supabase
        .from('project_papers')
        .update({
          refined_objective: current ? `${current}${html}` : html,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paperState.id)
        .select('id, refined_objective, updated_at')
        .single()
      if (error) throw error
      setPaperState((previous: any) => ({ ...previous, ...data }))
      onReload()
      setGeneratedConcept(null)
      toast({
        title: 'Moodboard incluído',
        description: 'O conceito sintético foi identificado e salvo no Paper.',
      })
    } catch (error: any) {
      toast({
        title: 'Falha ao adicionar o moodboard',
        description: error.message || 'Não foi possível salvá-lo no Paper.',
        variant: 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }, [generatedConcept, paperState?.id, isReadOnly, project?.id, visualDirection, onReload, toast])

  const addInternalMatch = useCallback(
    (item: InternalMatch) => {
      void appendInternalMatch(item)
    },
    [appendInternalMatch],
  )

  const canRun = Boolean(project?.id && paperState?.id && !isReadOnly)
  const timeLabel = result?.analyzedAt ? formatDate(result.analyzedAt) : null
  const renderSources = (sources: SourceLink[]) =>
    sources.length ? (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fontes citadas
        </p>
        <ul className="space-y-1">
          {sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ) : null
  const searchChip = (html: string, title: string) =>
    html ? (
      <iframe
        title={title}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        className="min-h-[90px] w-full border-0"
        srcDoc={html}
      />
    ) : null

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-purple-700 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">
              Benchmarks com IA e pesquisa fundamentada
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-zinc-600">
              Analisa o briefing, pesquisa cases com fontes, traz imagens com atribuição, sugere
              caminhos criativos e canais e encontra projetos concluídos que você pode acessar.
            </p>
          </div>
        </div>
        <Button onClick={runAnalysis} disabled={!canRun || busy !== null} className="shrink-0">
          {busy === 'analyze' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : result ? (
            <RefreshCw className="mr-2 h-4 w-4" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {busy === 'analyze'
            ? 'Pesquisando…'
            : result
              ? 'Atualizar pesquisa'
              : 'Analisar briefing'}
        </Button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p>
          <strong>Privacidade e uso:</strong> identificadores do projeto/cliente, contatos e campos
          comerciais são omitidos; o Gemini recebe apenas contexto reduzido. Resultados
          fundamentados e links de busca permanecem nesta tela e não são armazenados pelo sistema; o
          texto de uma pesquisa pode ser copiado por você. Só projetos internos e moodboards criados
          por IA são gravados no Paper quando você escolhe explicitamente. Pesquisa e geração de
          imagens podem ter cobrança no Google; veja{' '}
          <a
            className="underline"
            href="https://ai.google.dev/gemini-api/docs/pricing"
            target="_blank"
            rel="noreferrer"
          >
            preços oficiais
          </a>
          .
        </p>
      </div>
      {isReadOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este Paper está em modo somente leitura; não é possível pesquisar ou adicionar conteúdo.
        </div>
      )}
      {!paperState && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Crie primeiro um Paper em rascunho na aba Informações Paper.
        </div>
      )}
      {errorMessage && (
        <Card className="border-red-200">
          <CardContent className="py-4 text-sm text-red-800">{errorMessage}</CardContent>
        </Card>
      )}
      {busy === 'analyze' && (
        <div className="flex items-center justify-center gap-3 rounded-xl border bg-white py-7 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          <span>Pesquisando cases, imagens, fontes e canais…</span>
        </div>
      )}
      {busy === 'image' && (
        <div className="flex items-center justify-center gap-3 rounded-xl border bg-white py-7 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          <span>Gerando moodboard-conceito no Gemini…</span>
        </div>
      )}
      {busy === 'save' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Salvando a seleção no Paper…
        </div>
      )}
      {!result && !busy && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-purple-50 p-4 text-purple-700">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Execute a pesquisa para obter cases públicos verificáveis, imagens atribuídas,
              projetos Side3 semelhantes e recomendações criativas/canais.
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">Gemini Search</Badge>
            {result.model && <Badge variant="outline">{result.model}</Badge>}
            {timeLabel && <span>Pesquisa desta sessão: {timeLabel}</span>}
          </div>
          {/* The unmodified Grounded Result and the corresponding Google Search Suggestion stay together and full width. */}
          <section
            className="space-y-0 rounded-2xl border bg-white p-4"
            aria-label="Resultado de texto fundamentado pelo Google"
          >
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-800">
              {result.groundedText}
            </pre>

            {searchChip(
              result.searchSuggestionHtml,
              'Sugestões de Pesquisa Google correspondentes à análise de texto',
            )}
          </section>
          {result.sources.length > 0 && (
            <section className="space-y-2 rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold">Fontes citadas no resultado</h3>
              {renderSources(result.sources)}
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={copyGroundedText}>
                Copiar texto desta pesquisa
              </Button>
            </section>
          )}

          {/* Google Image Search results link directly to the containing source page and keep that query's chip with them. */}
          <section
            className="space-y-3 rounded-2xl border bg-white p-4"
            aria-label="Resultados de Google Image Search"
          >
            <div>
              <h3 className="text-lg font-semibold">Imagens de referência encontradas</h3>
              <p className="text-sm text-muted-foreground">
                Imagens indexadas pelo Google; não são geradas. Cada imagem leva diretamente à sua
                página de origem para atribuição.
              </p>
            </div>
            {result.imageReferences.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.imageReferences.map((image, index) => (
                  <Card key={`${image.imageUrl}-${index}`} className="overflow-hidden">
                    <a
                      href={image.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`Abrir fonte: ${image.title}`}
                    >
                      <img
                        src={image.imageUrl}
                        alt={image.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="aspect-[4/3] w-full bg-zinc-100 object-cover"
                      />
                    </a>
                    <CardContent className="space-y-2 p-4">
                      <p className="text-sm font-medium">{image.title}</p>
                      <a
                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                        href={image.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Origem e atribuição — {image.domain} <ExternalLink className="h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma imagem com atribuição foi retornada.
              </p>
            )}
            {searchChip(
              result.imageSearchSuggestionHtml,
              'Sugestões de Pesquisa Google correspondentes às imagens',
            )}
          </section>

          {/* Internal project records are a separate, RLS-filtered source; they are not Google Search output. */}
          {result.internalMatches.length > 0 && (
            <section className="space-y-3 border-t pt-5">
              <div>
                <h3 className="text-lg font-semibold">Projetos concluídos semelhantes na Side3</h3>
                <p className="text-sm text-muted-foreground">
                  Correspondências aproximadas, somente em projetos visíveis para sua conta.
                  “Concluído” não comprova execução de campanha nem desempenho.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {result.internalMatches.map((match) => (
                  <Card key={match.projectId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{match.projectName}</CardTitle>
                      <CardDescription>
                        {match.projectCode || 'Projeto interno'}
                        {formatDate(match.endDate)
                          ? ` • concluído em ${formatDate(match.endDate)}`
                          : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {match.matchTerms.map((term) => (
                          <Badge key={term} variant="secondary" className="font-normal">
                            {term}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{match.evidence}</p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                          href={`/projetos/${match.projectId}/paper`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir Paper <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isReadOnly || busy !== null}
                          onClick={() => void appendInternalMatch(match)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Adicionar ao Paper
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Moodboard-conceito por IA (opcional)</h3>
              <p className="text-sm text-muted-foreground">
                Direção visual digitada por você — não usamos a pesquisa do Google para gerar a
                imagem. Não é peça/foto real de campanha. Até {MAX_CONCEPT_IMAGES_PER_RESEARCH}{' '}
                gerações por pesquisa; pode haver cobrança no Google.
              </p>
            </div>
            <Card>
              <CardContent className="space-y-3 p-4">
                <Textarea
                  value={visualDirection}
                  onChange={(event) => setVisualDirection(event.target.value.slice(0, 1200))}
                  maxLength={1200}
                  rows={4}
                  disabled={isReadOnly || busy !== null}
                  placeholder="Descreva sua própria ideia visual, sem dados pessoais ou marcas (mínimo 20 caracteres)."
                />
                {generatedConcept && (
                  <div className="space-y-2">
                    <img
                      src={generatedConcept.dataUrl}
                      alt="Moodboard conceitual gerado por IA; não é campanha real"
                      className="max-h-[420px] w-full rounded-lg border bg-zinc-50 object-contain"
                    />
                    <p className="text-xs text-amber-800">
                      Imagem sintética de IA — não representa campanha executada.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isReadOnly || busy !== null}
                      onClick={() => void addGeneratedImageToPaper()}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Salvar moodboard no Paper
                    </Button>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    isReadOnly ||
                    busy !== null ||
                    conceptImagesGenerated >= MAX_CONCEPT_IMAGES_PER_RESEARCH
                  }
                  onClick={() => void generateConceptImage()}
                >
                  {busy === 'image' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="mr-2 h-4 w-4" />
                  )}
                  {generatedConcept ? 'Gerar outro moodboard' : 'Gerar moodboard'}
                </Button>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
