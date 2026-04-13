-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "avatar_url" TEXT,
    "department" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_login" DATETIME,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" DATETIME,
    "force_password_change" BOOLEAN NOT NULL DEFAULT false,
    "island_calendar" TEXT NOT NULL DEFAULT 'none'
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    "ip_address" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_datetime" DATETIME NOT NULL,
    "end_datetime" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'guardia',
    "color" TEXT NOT NULL DEFAULT '#1e3a5f',
    "location" TEXT,
    "notes" TEXT,
    "is_last_minute" BOOLEAN NOT NULL DEFAULT false,
    "hours_per_day" REAL DEFAULT 8,
    "calendar_type" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedule_assignments" (
    "schedule_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("schedule_id", "user_id"),
    CONSTRAINT "schedule_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notify_modifications" BOOLEAN NOT NULL DEFAULT true,
    "notify_last_minute" BOOLEAN NOT NULL DEFAULT true,
    "friday_reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "friday_reminder_time" TEXT NOT NULL DEFAULT '12:00',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" TEXT,
    "webhook_config_id" TEXT,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "schedule_id" TEXT,
    CONSTRAINT "notification_logs_webhook_config_id_fkey" FOREIGN KEY ("webhook_config_id") REFERENCES "webhook_configs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notification_logs_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details_json" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "theme_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL DEFAULT 'global',
    "preset" TEXT NOT NULL DEFAULT 'corporate',
    "tokens_json" TEXT NOT NULL,
    "overrides_json" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "schedules_start_datetime_end_datetime_idx" ON "schedules"("start_datetime", "end_datetime");

-- CreateIndex
CREATE INDEX "notification_logs_sent_at_idx" ON "notification_logs"("sent_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "theme_settings_key_key" ON "theme_settings"("key");
