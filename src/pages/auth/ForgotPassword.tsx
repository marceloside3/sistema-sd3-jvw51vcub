import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock } from 'lucide-react'

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl shadow-orange-500/30 mb-5">
            <span className="text-white font-extrabold text-2xl tracking-tighter">SD3</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-premium-lg text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center">
              <Lock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Recuperar Senha</h1>
          <p className="text-gray-400 text-sm mb-6">
            Esta funcionalidade estará disponível em breve.
          </p>
          <div className="bg-orange-500/10 text-orange-300 p-4 rounded-xl font-medium border border-orange-500/20 text-sm">
            Em breve
          </div>
          <Button
            asChild
            variant="ghost"
            className="w-full mt-6 text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
