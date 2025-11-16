import { invoke } from "@tauri-apps/api/core";

export type LibraryGame = {
  appid: number;
  name: string;
  installed: boolean;
  shared_from?: string | null;
  playtime_minutes?: number | null;
};

export type AccountHint = {
  steamid64: string;
  persona: string;
};

export type PartialSettings = {
  api_key?: string;
  main_steam_id64?: string;
  family_ids?: string[];
  ai_api_key?: string;
  ai_base_url?: string;
};

export const call = <T,>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> => invoke<T>(cmd, args);
