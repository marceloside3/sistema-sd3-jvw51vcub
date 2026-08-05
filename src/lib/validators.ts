export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/[^\d]+/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1+$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i)
  let rev = 11 - (sum % 11)
  if (rev >= 10) rev = 0
  if (rev !== parseInt(clean[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i)
  rev = 11 - (sum % 11)
  if (rev >= 10) rev = 0
  return rev === parseInt(clean[10])
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/[^\d]+/g, '')
  if (clean.length !== 14) return false
  if (/^(\d)\1+$/.test(clean)) return false
  let size = clean.length - 2
  let numbers = clean.substring(0, size)
  let digits = clean.substring(size)
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

export function maskCPF(value: string): string {
  let v = value.replace(/\D/g, '').substring(0, 11)
  v = v.replace(/(\d{3})(\d)/, '$1.$2')
  v = v.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
  v = v.replace(/\.(\d{3})(\d{1,2})$/, '$1-$2')
  return v
}

export function maskCNPJ(value: string): string {
  let v = value.replace(/\D/g, '').substring(0, 14)
  v = v.replace(/^(\d{2})(\d)/, '$1.$2')
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2')
  v = v.replace(/(\d{4})(\d)/, '$1-$2')
  return v
}

export function maskPhone(value: string): string {
  let v = value.replace(/\D/g, '').substring(0, 11)
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
  v = v.replace(/(\d)(\d{4})$/, '$1-$2')
  return v
}

export function maskCEP(value: string): string {
  let v = value.replace(/\D/g, '').substring(0, 8)
  v = v.replace(/(\d{5})(\d)/, '$1-$2')
  return v
}

export function maskAgency(value: string): string {
  return value.replace(/[^\d-]/g, '').substring(0, 7)
}

export function maskAccount(value: string): string {
  return value.replace(/[^\d-]/g, '').substring(0, 14)
}
