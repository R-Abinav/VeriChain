/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FACT_CHECK_REGISTRY_ADDRESS: `0x${string}`;
  readonly VITE_STAKE_POOL_ADDRESS: `0x${string}`;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}