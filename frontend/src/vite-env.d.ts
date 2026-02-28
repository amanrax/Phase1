// src/env.d.ts
/// <reference types="vite/client" />

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MOBILE_API_URL?: string;
  readonly VITE_API_PROD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
