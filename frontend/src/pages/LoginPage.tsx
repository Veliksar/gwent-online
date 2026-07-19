import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import { useT } from '../i18n'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const t = useT()

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.profile, data.token)
      navigate('/')
    },
    onError: (err: Error & { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors
      if (errors) {
        const firstError = Object.values(errors)[0]?.[0]
        setError(firstError || t.login.error)
      } else {
        setError(err.response?.data?.message || t.login.error)
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate(formData)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gwent-gold mb-2">Gwent Classic</h1>
          <p className="text-gray-400">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.login.email}</label>
            <input
              type="email"
              className="input-field"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.login.password}</label>
            <input
              type="password"
              className="input-field"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-gold w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? t.login.submitting : t.login.submit}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400">
          {t.login.noAccount}{' '}
          <Link to="/register" className="text-gwent-gold hover:underline">
            {t.login.registerLink}
          </Link>
        </p>
      </div>
    </div>
  )
}
