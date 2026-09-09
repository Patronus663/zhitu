import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/utils/api';

interface User {
  id: string;
  nickname: string;
  major?: string;
  grade?: string;
  learning_goal?: string;
  mastery_expectation?: string;
  personalized_info?: string;
  is_onboarded: boolean;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  createUser: (data: Partial<User>) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  isOnboarded: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  createUser: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  updateUser: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  // 业务用户与 Supabase 账号一一对应（users.id = auth uid），随登录态自动加载/清空
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!isAuthenticated || !authUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const result = await userApi.get(authUser.id);
        if (!cancelled) setUser(result.user);
      } catch {
        // 未创建业务用户（等待 onboarding）或接口异常
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, authUser?.id]);

  const createUser = useCallback(async (data: Partial<User>) => {
    const result = await userApi.create({
      nickname: data.nickname || '同学',
      major: data.major,
      grade: data.grade,
      learning_goal: data.learning_goal,
      mastery_expectation: data.mastery_expectation,
      personalized_info: data.personalized_info,
    });
    setUser(result.user);
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    if (!user) return;
    const result = await userApi.update(user.id, data);
    setUser(result.user);
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const result = await userApi.get(user.id);
    setUser(result.user);
  }, [user]);

  return (
    <UserContext.Provider value={{
      user,
      isLoading: isLoading || authLoading,
      isOnboarded: user?.is_onboarded ?? false,
      createUser,
      updateUser,
      refreshUser,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
