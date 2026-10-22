// lib/utils/messageFilter.ts

interface BlockedPattern {
  regex: RegExp
  message: string
}

const BLOCKED_PATTERNS: BlockedPattern[] = [
  { regex: /(\+91|0)?[6-9]\d{9}/, message: 'Phone numbers are not allowed' },
  { regex: /\d{5}\s?\d{5}/, message: 'Phone numbers are not allowed' },
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, message: 'Email addresses are not allowed' },
  { regex: /(https?:\/\/)?(www\.)?([a-z0-9-]+\.)+[a-z]{2,}/i, message: 'URLs are not allowed' },
  { regex: /@[a-zA-Z0-9_]{3,}/, message: 'Social media handles are not allowed' },
  { regex: /whatsapp|instagram|facebook|telegram|snapchat/i, message: 'Social media references are not allowed' },
  { regex: /(call|contact|dm|message)\s+(me|us)/i, message: 'Direct contact requests are not allowed' },
]

export interface ValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Validate message content for blocked contact information
 * Frontend validation - will be enforced on backend in production
 */
export function validateMessageContent(content: string): ValidationResult {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.regex.test(content)) {
      return { valid: false, reason: pattern.message }
    }
  }
  return { valid: true }
}

/**
 * Check if content might contain blocked information (for warnings)
 */
export function containsSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /\d{4,}/,  // 4+ digits
    /@/,       // @ symbol
    /\.(com|in|net|org)/i,
    /nine|eight|seven|six/i,
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(content))
}
