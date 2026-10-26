const copIntegerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function parseCOP(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : ''
}

export function formatCOPNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? copIntegerFormatter.format(amount) : ''
}

export function formatCOP(value) {
  const amount = Number(value)
  return `$${copIntegerFormatter.format(Number.isFinite(amount) ? amount : 0)} COP`
}
