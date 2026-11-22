/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base do backend em produção (ex.: https://api.tanquei.app). Vazio em dev. */
  readonly VITE_API_BASE?: string;
}
