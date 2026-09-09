import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const USER_ID_KEY = '@zhitu_user_id';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const storedId = await AsyncStorage.getItem(USER_ID_KEY);
      if (storedId) {
        const result = await userApi.get(storedId);
        setUser(result.user);
      }
    } catch {
      // User not found or error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const createUser = useCallback(async (data: Partial<User>) => {
    const result = await userApi.create({
      nickname: data.nickname || '同学',
      major: data.major,
      grade: data.grade,
      learning_goal: data.learning_goal,
      mastery_expectation: data.mastery_expectation,
      personalized_info: data.personalized_info,
    });
    await AsyncStorage.setItem(USER_ID_KEY, result.user.id);
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
      isLoading,
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
