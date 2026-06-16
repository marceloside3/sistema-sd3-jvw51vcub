import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { ShieldCheck } from 'lucide-react'
import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[A-Z]/, 'Pelo menos 1 letra maiúscula')
  .regex(/[a-z]/, 'Pelo menos 1 letra minúscula')
  .regex(/[0-9]/, 'Pelo menos 1 número')
  .regex(/[^A-Za-z0-9]/, 'Pelo menos 1 caractere especial')

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: 'Link inválido ou expirado',
          description: 'Por favor, solicite um novo convite.',
          variant: 'destructive',
        })
        navigate('/login')
      }
    }
    checkSession()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    try {
      passwordSchema.parse(password)
    } catch (err: any) {
      setError(err.errors[0].message)
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    toast({
      title: 'Senha definida com sucesso!',
      description: 'Você já pode acessar o sistema.',
    })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600 mb-4">
          <ShieldCheck className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Definir nova senha
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Crie uma senha forte para sua conta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Nova Senha</CardTitle>
            <CardDescription className="text-center">
              Requisitos: mínimo 8 caracteres, maiúscula, minúscula, número e símbolo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Definir Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
