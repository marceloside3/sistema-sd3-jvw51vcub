import { supabase } from '@/lib/supabase/client'

export const validatePasswordStrength = async (
  password: string,
  email?: string,
  fullName?: string,
) => {
  const { data, error } = await supabase.functions.invoke('validate-password', {
    body: { password, email, fullName },
  })
  return { data, error }
}
