import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

// In-memory cache to prevent redundant queries
let slaCache: Record<string, any> = {}
let cacheLoaded = false

export function useSlaConfig() {
  const [configs, setConfigs] = useState<Record<string, any>>(slaCache)
  const [loading, setLoading] = useState(!cacheLoaded)

  useEffect(() => {
    if (cacheLoaded) {
      setConfigs(slaCache)
      setLoading(false)
      return
    }

    async function fetchSla() {
      const { data, error } = await supabase.from('sla_configs').select('*').eq('is_active', true)

      if (data && !error) {
        const map = data.reduce((acc, curr) => ({ ...acc, [curr.stage_code]: curr }), {})
        slaCache = map
        cacheLoaded = true
        setConfigs(map)
      }
      setLoading(false)
    }

    fetchSla()
  }, [])

  return { configs, loading }
}
