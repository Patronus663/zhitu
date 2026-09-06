import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  timestamp,
  varchar,
  text,
  integer,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";

// System table - DO NOT DELETE
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// Users table - each user has a unique ID
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    nickname: varchar("nickname", { length: 100 }).notNull(),
    major: varchar("major", { length: 200 }),
    grade: varchar("grade", { length: 50 }),
    learning_goal: text("learning_goal"),
    mastery_expectation: text("mastery_expectation"),
    personalized_info: text("personalized_info"),
    is_onboarded: boolean("is_onboarded").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("users_created_at_idx").on(table.created_at)]
);

// Cloud question bank - shared among all users
export const questions = pgTable(
  "questions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    content: text("content").notNull(),
    answer: text("answer"),
    images: jsonb("images"),
    subject: varchar("subject", { length: 100 }),
    question_type: varchar("question_type", { length: 100 }),
    knowledge_points: jsonb("knowledge_points"),
    methods: jsonb("methods"),
    difficulty: integer("difficulty").default(3),
    rating: integer("rating").default(3),
    rating_count: integer("rating_count").default(0),
    is_active: boolean("is_active").default(true).notNull(),
    created_by: varchar("created_by", { length: 36 }).references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("questions_subject_idx").on(table.subject),
    index("questions_difficulty_idx").on(table.difficulty),
    index("questions_rating_idx").on(table.rating),
    index("questions_is_active_idx").on(table.is_active),
    index("questions_created_at_idx").on(table.created_at),
    index("questions_created_by_idx").on(table.created_by),
  ]
);

// User's personal question bank
export const userQuestions = pgTable(
  "user_questions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    question_id: varchar("question_id", { length: 36 }).notNull().references(() => questions.id),
    wrong_answer: text("wrong_answer"),
    error_analysis: text("error_analysis"),
    is_mastered: boolean("is_mastered").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("user_questions_user_id_idx").on(table.user_id),
    index("user_questions_question_id_idx").on(table.question_id),
    index("user_questions_is_mastered_idx").on(table.is_mastered),
  ]
);

// User learning profile
export const learningProfiles = pgTable(
  "learning_profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    learning_habits: text("learning_habits"),
    error_patterns: text("error_patterns"),
    mastered_points: text("mastered_points"),
    weak_points: text("weak_points"),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("learning_profiles_user_id_idx").on(table.user_id),
  ]
);

// Study plans
export const studyPlans = pgTable(
  "study_plans",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    start_date: varchar("start_date", { length: 20 }),
    end_date: varchar("end_date", { length: 20 }),
    is_active: boolean("is_active").default(true).notNull(),
    plan_type: varchar("plan_type", { length: 20 }).default('daily').notNull(), // 'daily' or 'long_term'
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("study_plans_user_id_idx").on(table.user_id),
    index("study_plans_is_active_idx").on(table.is_active),
    index("study_plans_plan_type_idx").on(table.plan_type),
  ]
);

// Study plan items
export const planItems = pgTable(
  "plan_items",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    plan_id: varchar("plan_id", { length: 36 }).notNull().references(() => studyPlans.id),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    due_date: varchar("due_date", { length: 20 }),
    is_completed: boolean("is_completed").default(false).notNull(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    sort_order: integer("sort_order").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("plan_items_plan_id_idx").on(table.plan_id),
    index("plan_items_due_date_idx").on(table.due_date),
    index("plan_items_is_completed_idx").on(table.is_completed),
  ]
);

// Chat messages with AI
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_user_id_idx").on(table.user_id),
    index("chat_messages_created_at_idx").on(table.created_at),
  ]
);

// Usage records
export const usageRecords = pgTable(
  "usage_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    action_type: varchar("action_type", { length: 50 }).notNull(),
    detail: text("detail"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("usage_records_user_id_idx").on(table.user_id),
    index("usage_records_action_type_idx").on(table.action_type),
    index("usage_records_created_at_idx").on(table.created_at),
  ]
);
