import Papa from 'papaparse'

function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

export function parseCSV<T extends Record<string, string>>(csvText: string): T[] {
  const cleaned = stripBOM(csvText)

  const result = Papa.parse<T>(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => {
      const trimmed = value.trim()
      return trimmed === '' ? null : trimmed
    },
  })

  if (result.errors.length > 0) {
    console.warn(
      '[csv-parser] Parse warnings:',
      result.errors.map((e) => `Row ${e.row}: ${e.message}`)
    )
  }

  return result.data as T[]
}
