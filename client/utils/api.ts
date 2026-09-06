const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '上传失败');
  }
  return res.json();
}

// User APIs
export const userApi = {
  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：POST /api/v1/users
   * Body 参数：id?: string, nickname: string, major?: string, grade?: string, learning_goal?: string, mastery_expectation?: string, personalized_info?: string
   */
  create: (data: { id?: string; nickname: string; major?: string; grade?: string; learning_goal?: string; mastery_expectation?: string; personalized_info?: string }) =>
    request<{ user: any }>('/api/v1/users', { method: 'POST', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：GET /api/v1/users/:id
   * Path 参数：id: string
   */
  get: (id: string) =>
    request<{ user: any }>(`/api/v1/users/${id}`),
  /**
   * 服务端文件：server/src/routes/users.ts
   * 接口：PUT /api/v1/users/:id
   * Path 参数：id: string
   * Body 参数：nickname?: string, major?: string, grade?: string, learning_goal?: string, mastery_expectation?: string, personalized_info?: string, is_onboarded?: boolean
   */
  update: (id: string, data: Record<string, any>) =>
    request<{ user: any }>(`/api/v1/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Question APIs
export const questionApi = {
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：POST /api/v1/questions/analyze-image
   * Body: FormData with images[]
   */
  analyzeImage: (formData: FormData) =>
    uploadFile<{ text: string }>('/api/v1/questions/analyze-image', formData),
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：POST /api/v1/questions/analyze
   * Body 参数：content: string, wrong_answer?: string, correct_answer?: string
   */
  analyze: (data: { content: string; wrong_answer?: string; correct_answer?: string }) =>
    request<{ analysis: any }>('/api/v1/questions/analyze', { method: 'POST', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：POST /api/v1/questions/validate-tags
   * Body 参数：content: string, subject: string, question_type: string, knowledge_points: string[], methods: string[], difficulty: number
   */
  validateTags: (data: any) =>
    request<{ validation: any }>('/api/v1/questions/validate-tags', { method: 'POST', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：POST /api/v1/questions/ai-answer
   * Body 参数：content: string, wrong_answer?: string
   */
  aiAnswer: (data: { content: string; wrong_answer?: string }) =>
    request<{ ai_result: any }>('/api/v1/questions/ai-answer', { method: 'POST', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：POST /api/v1/questions
   * Body 参数：user_id: string, content: string, answer: string, images?: string[], subject: string, question_type: string, knowledge_points: string[], methods: string[], difficulty: number, wrong_answer?: string, error_analysis?: string
   */
  create: (data: any) =>
    request<any>('/api/v1/questions', { method: 'POST', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：GET /api/v1/questions?user_id={user_id}
   * Query 参数：user_id: string
   * 返回：{ questions: any[] }
   */
  getMyQuestions: async (userId: string) => {
    const result = await request<{ questions: any[] }>(`/api/v1/questions?user_id=${userId}`);
    // Flatten the nested structure: each item has a nested 'questions' object with the actual data
    return (result.questions || []).map((item: any) => ({
      ...item.questions,
      wrong_answer: item.wrong_answer,
      error_analysis: item.error_analysis,
      is_mastered: item.is_mastered,
      user_question_id: item.id,
      created_at: item.created_at,
    }));
  },
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：GET /api/v1/questions/:id
   * Path 参数：id: string
   */
  getQuestionDetail: async (questionId: string) => {
    const result = await request<{ question: any }>(`/api/v1/questions/${questionId}`);
    return result.question;
  },
  /**
   * 服务端文件：server/src/routes/questions.ts
   * 接口：DELETE /api/v1/questions/:id
   * Path 参数：id: string
   */
  deleteQuestion: async (questionId: string) => {
    return request(`/api/v1/questions/${questionId}`, { method: 'DELETE' });
  },
};

// Search APIs
export const searchApi = {
  /**
   * 服务端文件：server/src/routes/search.ts
   * 接口：POST /api/v1/search
   * Body 参数：user_id?: string, scope: 'cloud' | 'user', query: string, count: number
   * 返回：{ questions: any[], search_intent: any, total: number }
   */
  search: async (data: { user_id?: string; scope: 'cloud' | 'user'; query: string; count: number }) => {
    const result = await request<{ questions: any[]; search_intent: any; total: number }>('/api/v1/search', {
      method: 'POST',
      body: JSON.stringify({
        scope: data.scope,
        user_id: data.user_id,
        description: data.query,
        count: data.count,
      }),
    });
    return { results: result.questions };
  },
  /**
   * 服务端文件：server/src/routes/search.ts
   * 接口：POST /api/v1/search/rate
   * Body 参数：question_id: string, user_id: string, rating: number
   */
  rate: (questionId: string, userId: string | undefined, rating: number) =>
    request<any>('/api/v1/search/rate', { method: 'POST', body: JSON.stringify({ question_id: questionId, user_id: userId, rating }) }),
  /**
   * 服务端文件：server/src/routes/search.ts
   * 接口：POST /api/v1/search/feedback
   * Body 参数：question_id: string, user_id: string
   */
  feedback: (questionId: string, userId: string | undefined) =>
    request<{ removed: boolean }>('/api/v1/search/feedback', { method: 'POST', body: JSON.stringify({ question_id: questionId, user_id: userId }) }),
};

// Learning APIs
export const learningApi = {
  /**
   * 服务端文件：server/src/routes/learning.ts
   * 接口：GET /api/v1/learning/:user_id
   * Path 参数：user_id: string
   * 返回：{ profile: any, user: any }
   */
  getProfile: async (userId: string) => {
    const result = await request<{ profile: any; user: any }>(`/api/v1/learning/${userId}`);
    return result.profile || {};
  },
  /**
   * 服务端文件：server/src/routes/learning.ts
   * 接口：POST /api/v1/learning/analyze
   * Body 参数：user_id: string
   * 返回：{ analysis: { summary, strengths, weaknesses, suggestions, ... } }
   */
  analyze: async (userId: string) => {
    const result = await request<{ analysis: any }>('/api/v1/learning/analyze', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    const a = result.analysis || {};
    const suggestions = [
      a.summary || '',
      ...(a.suggestions || []),
      ...(a.recommended_actions || []),
    ].filter(Boolean).join('\n\n');
    return { suggestions };
  },
  /**
   * 服务端文件：server/src/routes/learning.ts
   * 接口：POST /api/v1/learning/:user_id/feedback
   * Body 参数：feedback: string
   */
  updateWithFeedback: (userId: string, feedback: string) =>
    request<any>(`/api/v1/learning/${userId}/feedback`, { method: 'POST', body: JSON.stringify({ feedback }) }),
};

// Plan APIs
export const planApi = {
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：GET /api/v1/plans/:user_id/today
   * Path 参数：user_id: string
   * 返回：{ today_items: any[], week_items: any[], stats?: { total, completed } }
   */
  getToday: async (userId: string) => {
    const result = await request<{ today_items: any[]; week_items: any[]; stats: { today: { total: number; completed: number }; week: { total: number; completed: number } } }>(`/api/v1/plans/${userId}/today`);
    return {
      today_items: result.today_items || [],
      week_items: result.week_items || [],
      stats: result.stats || { today: { total: 0, completed: 0 }, week: { total: 0, completed: 0 } },
    };
  },
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：POST /api/v1/plans/generate
   * Body 参数：user_id: string, learning_content: string
   * 返回：{ plan_data: any }
   */
  generate: async (userId: string, learningContent: string, _duration: number) => {
    const result = await request<{ plan_data: any }>('/api/v1/plans/generate', { method: 'POST', body: JSON.stringify({ user_id: userId, learning_content: learningContent }) });
    return { plan: result.plan_data };
  },
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：POST /api/v1/plans
   * Body 参数：user_id: string, title: string, description?: string, start_date?: string, end_date?: string, plan_type?: 'daily' | 'long_term', items?: Array<{title: string, description?: string, due_date: string}>
   */
  create: (data: { user_id: string; title: string; description?: string; start_date?: string; end_date?: string; plan_type?: 'daily' | 'long_term'; items?: any[] }) =>
    request<any>('/api/v1/plans', { method: 'POST', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：DELETE /api/v1/plans/:plan_id
   * Path 参数：plan_id: string
   */
  delete: (planId: string) =>
    request<any>(`/api/v1/plans/${planId}`, { method: 'DELETE' }),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：GET /api/v1/plans/:user_id
   * Path 参数：user_id: string
   * 返回：Array<{ id, title, status, ... }>
   */
  getUserPlans: async (userId: string) => {
    const result = await request<{ plans: any[] }>(`/api/v1/plans/${userId}`);
    return result.plans || [];
  },
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：GET /api/v1/plans/detail/:plan_id
   * Path 参数：plan_id: string
   * 返回：{ id, title, description, start_date, end_date, is_active, items: [...] }
   */
  getPlanDetail: (planId: string) =>
    request<any>(`/api/v1/plans/detail/${planId}`),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：POST /api/v1/plans/:plan_id/items
   * Path 参数：plan_id: string
   * Body 参数：title: string, description?: string, due_date?: string, sort_order?: number
   * 返回：{ item: { id, title, description, due_date, is_completed, ... } }
   */
  addItem: (planId: string, data: { title: string; description?: string; due_date?: string; sort_order?: number }) =>
    request<{ item: any }>(`/api/v1/plans/${planId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：PUT /api/v1/plans/items/:item_id/complete
   * Path 参数：item_id: string
   * Body 参数：is_completed: boolean
   */
  completeItem: (itemId: string, isCompleted: boolean) =>
    request<any>(`/api/v1/plans/items/${itemId}/complete`, { method: 'PUT', body: JSON.stringify({ is_completed: isCompleted }) }),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：GET /api/v1/plans/items/:item_id
   * Path 参数：item_id: string
   * 返回：{ item: { id, title, description, due_date, is_completed, ... } }
   */
  getItem: (itemId: string) =>
    request<{ item: any }>(`/api/v1/plans/items/${itemId}`),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：PUT /api/v1/plans/items/:item_id
   * Path 参数：item_id: string
   * Body 参数：title?: string, description?: string, due_date?: string
   */
  updateItem: (itemId: string, data: { title?: string; description?: string; due_date?: string; is_completed?: boolean }) =>
    request<any>(`/api/v1/plans/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：DELETE /api/v1/plans/items/:item_id
   * Path 参数：item_id: string
   */
  deleteItem: (itemId: string) =>
    request<any>(`/api/v1/plans/items/${itemId}`, { method: 'DELETE' }),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：POST /api/v1/plans/items/:item_id/move
   * Path 参数：item_id: string
   * Body 参数：new_due_date: string
   */
  moveItem: (itemId: string, newDueDate: string) =>
    request<any>(`/api/v1/plans/items/${itemId}/move`, { method: 'POST', body: JSON.stringify({ new_due_date: newDueDate }) }),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：GET /api/v1/plans/overdue/:user_id
   * Path 参数：user_id: string
   * 返回：{ overdue_items: any[] }
   */
  getOverdue: (userId: string) =>
    request<{ overdue_items: any[] }>(`/api/v1/plans/overdue/${userId}`),
  /**
   * 服务端文件：server/src/routes/plans.ts
   * 接口：POST /api/v1/plans/move-overdue/:user_id
   * Path 参数：user_id: string
   * 返回：{ moved: number }
   */
  moveOverdueToToday: (userId: string) =>
    request<{ moved: number }>(`/api/v1/plans/move-overdue/${userId}`, { method: 'POST' }),
};

// Chat APIs
export const chatApi = {
  /**
   * 服务端文件：server/src/routes/chat.ts
   * 接口：GET /api/v1/chat/:user_id/messages
   * Path 参数：user_id: string
   */
  getMessages: (userId: string) =>
    request<{ messages: any[] }>(`/api/v1/chat/${userId}/messages`),
  /**
   * 服务端文件：server/src/routes/chat.ts
   * 接口：POST /api/v1/chat/:user_id/messages
   * Body 参数：content: string
   * 返回：{ reply: string, message: any }
   */
  send: (userId: string, content: string) =>
    request<{ reply: string; message: any }>(`/api/v1/chat/${userId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
};
