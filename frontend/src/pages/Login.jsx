import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    localStorage.setItem('token', 'demo-token')
    navigate('/')
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-6">GTM360 HQ</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" className="w-full px-4 py-2 bg-gray-700 text-white rounded" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" className="w-full px-4 py-2 bg-gray-700 text-white rounded" />
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded">Sign In</button>
        </form>
      </div>
    </div>
  )
}
