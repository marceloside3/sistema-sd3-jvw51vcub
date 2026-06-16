import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="flex justify-center mb-4">
            <img
              src="https://img.usecurling.com/i?q=cube&color=blue&shape=fill"
              alt="SD3 Logo"
              className="w-12 h-12 rounded-xl"
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-blue-950">
            Bem-vindo de volta
          </CardTitle>
          <CardDescription className="text-gray-500">
            Entre com suas credenciais para acessar o Sistema Operacional SD3
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2 font-medium">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@side3.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-50/50"
              />
            </div>
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
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
                className="bg-gray-50/50"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
