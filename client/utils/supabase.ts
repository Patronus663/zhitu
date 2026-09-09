/**
 * 客户端 Supabase 实例
 *
 * - 从后端接口 /api/v1/supabase-config 动态获取 url 与 anonKey
 * - 使用 AsyncStorage 持久化 session（兼容三端）
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

let _client: SupabaseClient | null = null;

async function fetchConfig() {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/supabase-config`
  );
  if (!res.ok) {
    throw new Error("获取 Supabase 认证配置失败");
  }
  const data = await res.json();
  return { url: data.url as string, anonKey: data.anonKey as string };
}

/**
 * 获取（并按需初始化）Supabase 客户端实例
 */
export async function getSupabase(): Promise<SupabaseClient> {
  if (_client) return _client;
  const { url, anonKey } = await fetchConfig();
  _client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}