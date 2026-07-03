import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Globe } from 'lucide-react'

export function IntranetEmbed() {
  return (
    <Card className="shadow-premium border-zinc-100">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-orange-500" />
          Intranet SD3
        </CardTitle>
        <a
          href="https://side3.sharepoint.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-1"
        >
          Abrir <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-zinc-100 bg-zinc-50">
          <iframe
            src="https://side3.sharepoint.com"
            className="w-full h-[400px]"
            title="Intranet SD3"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            loading="lazy"
          />
        </div>
      </CardContent>
    </Card>
  )
}
