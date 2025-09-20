export interface CompiledModelResponse {
  language: string;
  definition: string;
  placeholders: Record<string, string>;
}
