import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirmation: '',
    nickname: '',
  })
  const [error, setError] = useState('')

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.profile, data.token)
      navigate('/')
    },
    onError: (err: Error & { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors
      if (errors) {
        const firstError = Object.values(errors)[0]?.[0]
        setError(firstError || 'Ошибка регистрации')
      } else {
        setError(err.response?.data?.message || 'Ошибка регистрации')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (formData.password !== formData.password_confirmation) {
      setError('Пароли не совпадают')
      return
    }
    
    registerMutation.mutate(formData)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gwent-gold mb-2">Gwent Classic</h1>
          <p className="text-gray-400">Создайте новый аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Никнейм</label>
            <input
              type="text"
              className="input-field"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Пароль</label>
            <input
              type="password"
              className="input-field"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Подтвердите пароль</label>
            <input
              type="password"
              className="input-field"
              value={formData.password_confirmation}
              onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-gold w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-gwent-gold hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
