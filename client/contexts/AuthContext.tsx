// @ts-nocheck
/**
 * 通用认证上下文（基于 Supabase Auth）
 *
 * 提供邮箱密码的登录 / 注册 / 登出，并维护 session 状态。
 * session 持久化于 AsyncStorage，可通过 x-session 请求头用于业务接口鉴权。
 */
import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/utils/supabase";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      try {
        const sb = await getSupabase();
        const { data } = await sb.auth.getSession();
        if (mounted) {
          setUser(data.session?.user ?? null);
          setToken(data.session?.access_token ?? null);
        }
        const { data: subData } = sb.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
          setToken(session?.access_token ?? null);
        });
        subscription = subData.subscription;
      } catch (e) {
        console.error("Auth init failed", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = await getSupabase();
    const { error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : prev));
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    signUp,
    logout,
    updateUser,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};