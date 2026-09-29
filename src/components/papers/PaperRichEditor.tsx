import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  UploadCloud,
  Loader2,
  Trash2,
  Maximize2,
  Minus,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadPaperImage } from '@/services/paper-images'
import { useToast } from '@/components/ui/use-toast'

interface PaperRichEditorProps {
  value: string
  onChange: (html: string) => void
  readOnly?: boolean
  projectId?: string
  placeholder?: string
}

interface SelectedImageState {
  element: HTMLImageElement
  width: number
  alignment: 'left' | 'center' | 'right'
}

export function PaperRichEditor({
  value,
  onChange,
  readOnly = false,
  projectId,
  placeholder = 'Comece a escrever o Paper aqui. Você pode digitar textos, colar imagens (Ctrl+V), arrastar arquivos ou clicar em Inserir Imagem...',
}: PaperRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null)
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  })

  // Sincronizar o HTML inicial / externo apenas quando o valor diferir do innerHTML
  useEffect(() => {
    if (!editorRef.current) return
    const currentHTML = editorRef.current.innerHTML
    // Se for o mesmo conteúdo ou se o editor já tem foco/edição, não sobrescreve
    if (value !== currentHTML) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const notifyChange = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    onChange(html)
  }, [onChange])

  const updateActiveFormats = useCallback(() => {
    if (readOnly) return
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      })
    } catch {
      // Ignora se não estiver disponível
    }
  }, [readOnly])

  const exec = (command: string, cmdValue: string | undefined = undefined) => {
    if (readOnly) return
    editorRef.current?.focus()
    document.execCommand(command, false, cmdValue)
    updateActiveFormats()
    notifyChange()
  }

  // Manipulação de inserção de imagem
  const insertImageAtCursor = useCallback(
    (src: string, alt = 'Imagem do Paper') => {
      if (!editorRef.current) return
      editorRef.current.focus()

      const figureHtml = `
        <figure class="paper-image-wrapper my-4 inline-block max-w-full text-center" style="display: block; margin: 1.25rem auto; text-align: center;">
          <img
            src="${src}"
            alt="${alt}"
            class="paper-img rounded-lg shadow-sm border border-zinc-200 inline-block transition-all"
            style="max-width: 100%; width: 560px; height: auto; cursor: pointer; display: inline-block;"
            data-align="center"
          />
        </figure>
        <p><br></p>
      `

      // Tenta inserir via insertHTML
      const success = document.execCommand('insertHTML', false, figureHtml)
      if (!success) {
        // Fallback: adicionar no fim do editor
        editorRef.current.innerHTML += figureHtml
      }

      notifyChange()
    },
    [notifyChange],
  )

  const handleUploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length === 0) {
        toast({
          title: 'Arquivo não suportado',
          description: 'Apenas arquivos de imagem (PNG, JPG, WEBP, GIF, SVG) são permitidos.',
          variant: 'destructive',
        })
        return
      }

      setIsUploading(true)
      try {
        for (const file of imageFiles) {
          const url = await uploadPaperImage(file, projectId)
          insertImageAtCursor(url, file.name)
        }
        toast({
          title: 'Imagem inserida',
          description: `${imageFiles.length} imagem(ns) adicionada(s) ao Paper.`,
        })
      } catch (err: any) {
        toast({
          title: 'Erro no envio da imagem',
          description: err.message || 'Não foi possível carregar a imagem.',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [projectId, insertImageAtCursor, toast],
  )

  // (a) Colar da área de transferência (Paste)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (readOnly) return
      const items = e.clipboardData?.items
      if (!items) return

      const imageItems: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile()
          if (blob) {
            imageItems.push(blob)
          }
        }
      }

      if (imageItems.length > 0) {
        e.preventDefault()
        handleUploadFiles(imageItems)
      } else {
        // Deixar texto normal fluir, atualizando após paste
        setTimeout(() => {
          notifyChange()
        }, 10)
      }
    },
    [readOnly, handleUploadFiles, notifyChange],
  )

  // (b) Drag & Drop sobre o editor
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (readOnly) return
      e.preventDefault()
      e.stopPropagation()
      if (!isDragOver) setIsDragOver(true)
    },
    [readOnly, isDragOver],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (readOnly) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
    },
    [readOnly],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (readOnly) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        handleUploadFiles(files)
      }
    },
    [readOnly, handleUploadFiles],
  )

  // Seleção e clique em imagem no editor para redimensionamento e alinhamento
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target && target.tagName === 'IMG') {
        const img = target as HTMLImageElement
        const parentFigure = img.closest('figure')
        let alignment: 'left' | 'center' | 'right' = 'center'
        if (parentFigure) {
          if (parentFigure.style.textAlign === 'left') alignment = 'left'
          else if (parentFigure.style.textAlign === 'right') alignment = 'right'
          else alignment = 'center'
        }

        const width = img.offsetWidth || parseInt(img.style.width, 10) || 560
        setSelectedImage({
          element: img,
          width,
          alignment,
        })
      } else if (!target.closest('.image-toolbar-container')) {
        setSelectedImage(null)
      }
      updateActiveFormats()
    },
    [updateActiveFormats],
  )

  // Redimensionamento da imagem selecionada
  const handleResizeImage = (delta: number) => {
    if (!selectedImage) return
    const img = selectedImage.element
    const currentWidth = selectedImage.width
    const newWidth = Math.max(160, Math.min(1200, currentWidth + delta))
    img.style.width = `${newWidth}px`
    setSelectedImage({ ...selectedImage, width: newWidth })
    notifyChange()
  }

  const handleSetImageWidthPreset = (width: number) => {
    if (!selectedImage) return
    const img = selectedImage.element
    img.style.width = `${width}px`
    setSelectedImage({ ...selectedImage, width })
    notifyChange()
  }

  // Alinhamento da imagem selecionada
  const handleAlignImage = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedImage) return
    const img = selectedImage.element
    const parentFigure = img.closest('figure') || img.parentElement

    if (parentFigure) {
      parentFigure.style.textAlign = alignment
      if (alignment === 'left') {
        parentFigure.style.margin = '1rem auto 1rem 0'
        parentFigure.style.display = 'block'
      } else if (alignment === 'right') {
        parentFigure.style.margin = '1rem 0 1rem auto'
        parentFigure.style.display = 'block'
      } else {
        parentFigure.style.margin = '1.25rem auto'
        parentFigure.style.display = 'block'
      }
    }
    img.setAttribute('data-align', alignment)
    setSelectedImage({ ...selectedImage, alignment })
    notifyChange()
  }

  // Remoção da imagem
  const handleDeleteImage = () => {
    if (!selectedImage) return
    const img = selectedImage.element
    const parentFigure = img.closest('figure')
    if (parentFigure) {
      parentFigure.remove()
    } else {
      img.remove()
    }
    setSelectedImage(null)
    notifyChange()
  }

  // Interceptar teclas no editor (Backspace com imagem selecionada, etc.)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return
    if (selectedImage && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault()
      handleDeleteImage()
      return
    }
    // Ao apertar Enter ou teclas normais, sincroniza
    setTimeout(() => {
      notifyChange()
      updateActiveFormats()
    }, 10)
  }

  // Fechar barra flutuante com tecla Esc ou clique fora
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.paper-rich-editor-wrapper')) {
        setSelectedImage(null)
      }
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  return (
    <div className="paper-rich-editor-wrapper relative space-y-3">
      {/* Input oculto para carregar arquivo do disco */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files)
          }
        }}
      />

      {/* Barra de Ferramentas / Toolbar (somente modo edição) */}
      {!readOnly && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-1 p-2 rounded-xl border border-zinc-200/80 bg-white/95 backdrop-blur-md shadow-sm">
          {/* Formatação de Texto */}
          <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 mr-1">
            <Button
              type="button"
              variant={activeFormats.bold ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              title="Negrito (Ctrl+B)"
              onClick={() => exec('bold')}
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant={activeFormats.italic ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              title="Itálico (Ctrl+I)"
              onClick={() => exec('italic')}
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant={activeFormats.underline ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              title="Sublinhado (Ctrl+U)"
              onClick={() => exec('underline')}
            >
              <Underline className="w-4 h-4" />
            </Button>
          </div>

          {/* Títulos / Estrutura */}
          <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 mr-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-semibold"
              title="Título Principal"
              onClick={() => exec('formatBlock', '<h1>')}
            >
              <Heading1 className="w-4 h-4 mr-0.5" /> H1
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-semibold"
              title="Subtítulo"
              onClick={() => exec('formatBlock', '<h2>')}
            >
              <Heading2 className="w-4 h-4 mr-0.5" /> H2
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-semibold"
              title="Seção menor"
              onClick={() => exec('formatBlock', '<h3>')}
            >
              <Heading3 className="w-4 h-4 mr-0.5" /> H3
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              title="Parágrafo normal"
              onClick={() => exec('formatBlock', '<p>')}
            >
              Texto
            </Button>
          </div>

          {/* Listas */}
          <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 mr-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Lista de marcadores"
              onClick={() => exec('insertUnorderedList')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Lista numerada"
              onClick={() => exec('insertOrderedList')}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          </div>

          {/* Alinhamento de Texto */}
          <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 mr-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Alinhar à esquerda"
              onClick={() => exec('justifyLeft')}
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Centralizar"
              onClick={() => exec('justifyCenter')}
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Alinhar à direita"
              onClick={() => exec('justifyRight')}
            >
              <AlignRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Inserir Imagem (Botão de Upload) */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium shadow-sm transition-all duration-200 hover:scale-[1.02]"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              Inserir Imagem
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar Flutuante de Ajuste da Imagem Selecionada */}
      {!readOnly && selectedImage && (
        <div className="image-toolbar-container sticky top-14 z-30 flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-blue-200 bg-blue-50/95 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1 text-xs font-semibold text-blue-900">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            Ajustar Imagem:
          </div>

          {/* Tamanhos Predefinidos */}
          <div className="flex items-center gap-1 border-r border-blue-200 pr-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs bg-white hover:bg-blue-100"
              onClick={() => handleSetImageWidthPreset(320)}
            >
              P (320px)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs bg-white hover:bg-blue-100"
              onClick={() => handleSetImageWidthPreset(560)}
            >
              M (560px)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs bg-white hover:bg-blue-100"
              onClick={() => handleSetImageWidthPreset(840)}
            >
              G (840px)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs bg-white hover:bg-blue-100"
              onClick={() => handleSetImageWidthPreset(1100)}
              title="Largura máxima"
            >
              <Maximize2 className="w-3 h-3 mr-1" /> 100%
            </Button>
          </div>

          {/* Ajuste fino +/- */}
          <div className="flex items-center gap-1 border-r border-blue-200 pr-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 bg-white"
              title="Diminuir largura"
              onClick={() => handleResizeImage(-50)}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-blue-900 font-mono px-1">
              {Math.round(selectedImage.width)}px
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 bg-white"
              title="Aumentar largura"
              onClick={() => handleResizeImage(50)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Alinhamento da Imagem */}
          <div className="flex items-center gap-1 border-r border-blue-200 pr-2">
            <Button
              type="button"
              size="sm"
              variant={selectedImage.alignment === 'left' ? 'secondary' : 'outline'}
              className="h-7 w-7 p-0 bg-white"
              title="Alinhar imagem à esquerda"
              onClick={() => handleAlignImage('left')}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedImage.alignment === 'center' ? 'secondary' : 'outline'}
              className="h-7 w-7 p-0 bg-white"
              title="Centralizar imagem"
              onClick={() => handleAlignImage('center')}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedImage.alignment === 'right' ? 'secondary' : 'outline'}
              className="h-7 w-7 p-0 bg-white"
              title="Alinhar imagem à direita"
              onClick={() => handleAlignImage('right')}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Excluir imagem */}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs ml-auto gap-1"
            onClick={handleDeleteImage}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir Imagem
          </Button>
        </div>
      )}

      {/* Editor Rico (Área de Edição / Tela em Branco) */}
      <div
        className={`relative min-h-[480px] rounded-2xl border transition-all duration-200 ${
          readOnly
            ? 'bg-zinc-50/70 border-zinc-200 p-6 cursor-default'
            : isDragOver
              ? 'bg-blue-50/50 border-2 border-dashed border-blue-500 shadow-inner'
              : 'bg-white border-zinc-200 shadow-sm focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-400/20'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Indicador de Drag & Drop ativo */}
        {isDragOver && !readOnly && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-blue-50/90 backdrop-blur-xs rounded-2xl border-2 border-dashed border-blue-500 pointer-events-none">
            <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce mb-2" />
            <p className="text-base font-medium text-blue-900">Solte suas imagens aqui</p>
            <p className="text-xs text-blue-700">Elas serão inseridas diretamente no Paper</p>
          </div>
        )}

        {/* Loading overlay durante upload */}
        {isUploading && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-white/90 border border-zinc-200 px-3 py-1.5 rounded-full shadow-sm">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-xs text-zinc-700 font-medium">Carregando imagem...</span>
          </div>
        )}

        {/* Elemento contentEditable */}
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={notifyChange}
          onBlur={notifyChange}
          onPaste={handlePaste}
          onClick={handleEditorClick}
          onKeyUp={updateActiveFormats}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className={`paper-editable-area outline-none min-h-[480px] p-6 text-zinc-900 leading-relaxed prose prose-zinc max-w-none ${
            readOnly ? 'select-text' : 'select-text'
          }`}
          style={{ wordBreak: 'break-word' }}
        />
      </div>

      {/* Dica de uso amigável para o usuário no rodapé do editor */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 px-2 pt-1 gap-2">
          <span>
            💡 <strong>Dica:</strong> Cole imagens com{' '}
            <kbd className="px-1 py-0.5 rounded bg-zinc-100 border text-[10px]">Ctrl+V</kbd>,
            arraste arquivos direto para cá ou use o botão <strong>Inserir Imagem</strong>.
          </span>
          <span>Clique numa imagem para redimensionar ou alinhar.</span>
        </div>
      )}

      {/* Estilos CSS Inline para tipografia do editor e seleção visual de imagens */}
      <style>{`
        .paper-editable-area:empty:before {
          content: attr(data-placeholder);
          color: #a1a1aa;
          pointer-events: none;
          display: block;
        }
        .paper-editable-area h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.25;
          color: #18181b;
        }
        .paper-editable-area h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
          color: #27272a;
        }
        .paper-editable-area h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
          color: #3f3f46;
        }
        .paper-editable-area p {
          margin-bottom: 0.75rem;
          line-height: 1.625;
        }
        .paper-editable-area ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .paper-editable-area ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .paper-editable-area li {
          margin-bottom: 0.25rem;
        }
        .paper-editable-area figure {
          margin: 1.25rem auto;
          display: block;
        }
        .paper-editable-area img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          display: inline-block;
          transition: outline 0.15s ease, box-shadow 0.15s ease;
        }
        .paper-editable-area img:hover {
          outline: 2px dashed #93c5fd;
        }
        .paper-editable-area img:focus,
        .paper-editable-area img:active {
          outline: 3px solid #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
      `}</style>
    </div>
  )
}
