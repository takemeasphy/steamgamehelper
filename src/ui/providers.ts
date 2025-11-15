export type ProviderPreset = {
  id: "openai" | "groq" | "openrouter" | "together" | "deepinfra";
  label: string;
  baseUrl: string;
  model: string;
  keyHint: string;
  keysUrl: string;
};

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "groq",
    label: "Groq (free tier)",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.1-8b-instant",
    keyHint: "gsk_...",
    keysUrl: "https://console.groq.com/keys",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/meta-llama/llama-3.1-8b-instruct",
    keyHint: "sk-or-v1-...",
    keysUrl: "https://openrouter.ai/keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    keyHint: "sk-proj-... або sk-...",
    keysUrl: "https://platform.openai.com/settings/keys",
  },
  {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
    keyHint: "together_...",
    keysUrl: "https://api.together.xyz/settings/api-keys",
  },
  {
    id: "deepinfra",
    label: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    keyHint: "di_...",
    keysUrl: "https://deepinfra.com/dash/api_keys",
  },
];
