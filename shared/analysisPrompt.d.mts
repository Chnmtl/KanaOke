export interface AnalysisPromptContext {
  artistName?: string | null
  lineIndex?: number
  surroundingLines?: string[]
  trackName?: string | null
}

export declare const promptForLine: (
  line: string,
  context: AnalysisPromptContext,
  lineRomaji: string,
) => string
