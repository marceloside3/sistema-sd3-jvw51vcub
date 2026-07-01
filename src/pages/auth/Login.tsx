import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import logoUrl from '@/assets/logoside3-0c37e.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, session } = useAuth()

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError('Credenciais inválidas')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={logoUrl} alt="SD3 Logo" className="h-14 object-contain mb-6 drop-shadow-lg" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Sistema Operacional
          </h1>
          <p className="text-gray-400 text-sm">
            Agência de Marketing — Plataforma de Gestão Integrada
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-premium-lg">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-white">Bem-vindo de volta</h2>
              <p className="text-gray-400 text-sm mt-1">Acesse sua conta para continuar</p>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="py-2.5 bg-red-500/10 border-red-500/20 text-red-300"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@side3.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500/50 focus:bg-white/10 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                  Senha
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500/50 focus:bg-white/10 transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-brand hover:shadow-lg hover:shadow-orange-500/40 transition-all duration-300 hover:scale-[1.02] group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          © 2026 SD3 — Agência de Marketing. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
