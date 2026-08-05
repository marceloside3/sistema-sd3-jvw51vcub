export function maskCPF(value: string): string {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.substring(0, 11)
  v = v.replace(/^(\d{3})(\d)/, '$1.$2')
  v = v.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
  v = v.replace(/\.(\d{3})(\d{1,2})$/, '$1-$2')
  return v
}

export function maskCNPJ(value: string): string {
  let v = value.replace(/\D/g, '')
  if (v.length > 14) v = v.substring(0, 14)
  v = v.replace(/^(\d{2})(\d)/, '$1.$2')
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2')
  v = v.replace(/(\d{4})(\d)/, '$1-$2')
  return v
}

export function maskPhone(value: string): string {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.substring(0, 11)
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
  v = v.replace(/(\d)(\d{4})$/, '$1-$2')
  return v
}

export function maskCEP(value: string): string {
  let v = value.replace(/\D/g, '')
  if (v.length > 8) v = v.substring(0, 8)
  v = v.replace(/^(\d{5})(\d)/, '$1-$2')
  return v
}

export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1+$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i)
  let result = (sum * 10) % 11
  if (result === 10) result = 0
  if (result !== parseInt(clean.charAt(9))) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i)
  result = (sum * 10) % 11
  if (result === 10) result = 0
  return result === parseInt(clean.charAt(10))
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/[^\d]+/g, '')
  if (clean === '') return true
  if (clean.length !== 14) return false
  if (/^(\d)\1+$/.test(clean)) return false

  let size = clean.length - 2
  let numbers = clean.substring(0, size)
  const digits = clean.substring(size)
  let sum = 0
  let pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  size = size + 1
  numbers = clean.substring(0, size)
  sum = 0
  pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === parseInt(digits.charAt(1))
}

export interface ViaCepResponse {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export async function fetchCep(cep: string): Promise<ViaCepResponse | null> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    const data: ViaCepResponse = await res.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}

export function maskDocument(value: string, type: 'PF' | 'PJ'): string {
  return type === 'PF' ? maskCPF(value) : maskCNPJ(value)
}

export function validateDocument(value: string, type: 'PF' | 'PJ'): boolean {
  if (type === 'PF') return validateCPF(value)
  return validateCNPJ(value)
}
