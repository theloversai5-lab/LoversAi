// lib/utils/calculations.ts

/**
 * Calculate lead unlock fee based on wedding budget
 * Fee = 0.01% of estimated budget (0.0001)
 */
export function calculateUnlockFee(budgetString: string): number {
  // Parse budget strings like "20-25L", "10-15L"
  const match = budgetString.match(/(\d+)-(\d+)L?/i)
  if (!match) return 0

  const min = parseInt(match[1])
  const max = parseInt(match[2])
  const midpoint = (min + max) / 2
  const budgetInRupees = midpoint * 100000 // Convert lakhs to rupees
  const fee = Math.round(budgetInRupees * 0.0001)

  return fee
}

/**
 * Format currency in Indian rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format budget range display
 */
export function formatBudgetRange(budgetString: string): string {
  const match = budgetString.match(/(\d+)-(\d+)L?/i)
  if (!match) return budgetString

  return `₹${match[1]}–${match[2]} Lakhs`
}
