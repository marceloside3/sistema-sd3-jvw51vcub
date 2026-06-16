import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg border-0 text-center">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex justify-center mb-4">
            <img
              src="https://img.usecurling.com/i?q=lock&color=blue&shape=outline"
              alt="Lock"
              className="w-12 h-12"
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-blue-950">
            Recuperar Senha
          </CardTitle>
          <CardDescription className="text-gray-500">
            Esta funcionalidade estará disponível em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg font-medium border border-blue-100">
            Em breve
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild variant="ghost" className="w-full text-gray-500 hover:text-gray-900">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
