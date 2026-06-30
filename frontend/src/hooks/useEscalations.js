import { useState, useEffect } from 'react'

export function useEscalations() {
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  return { escalations, loading }
}
