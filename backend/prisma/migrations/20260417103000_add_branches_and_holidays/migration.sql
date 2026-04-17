PRAGMA foreign_keys=OFF;

CREATE TABLE "branches" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "region" TEXT,
  "country_code" TEXT NOT NULL DEFAULT 'ES',
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

INSERT INTO "branches" (
  "id",
  "name",
  "code",
  "city",
  "region",
  "country_code",
  "timezone",
  "is_active",
  "created_at",
  "updated_at"
)
VALUES (
  'branch_default_main',
  'Sucursal Principal',
  'MAIN',
  'Sin especificar',
  'Sin especificar',
  'ES',
  'Europe/Madrid',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

CREATE TABLE "branch_holidays" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "branch_id" TEXT NOT NULL,
  "date" DATETIME NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'local',
  "scope" TEXT NOT NULL DEFAULT 'local',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "branch_holidays_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "branch_holidays_branch_id_date_idx" ON "branch_holidays"("branch_id", "date");
CREATE UNIQUE INDEX "branch_holidays_branch_id_date_name_key" ON "branch_holidays"("branch_id", "date", "name");

CREATE TABLE "new_schedules" (
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
  "branch_id" TEXT,
  "calendar_type" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_schedules" (
  "id",
  "title",
  "description",
  "start_datetime",
  "end_datetime",
  "type",
  "color",
  "location",
  "notes",
  "is_last_minute",
  "hours_per_day",
  "branch_id",
  "calendar_type",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  "id",
  "title",
  "description",
  "start_datetime",
  "end_datetime",
  "type",
  "color",
  "location",
  "notes",
  "is_last_minute",
  "hours_per_day",
  'branch_default_main',
  "calendar_type",
  "created_by",
  "created_at",
  "updated_at"
FROM "schedules";

DROP TABLE "schedules";
ALTER TABLE "new_schedules" RENAME TO "schedules";

CREATE INDEX "schedules_start_datetime_end_datetime_idx" ON "schedules"("start_datetime", "end_datetime");
CREATE INDEX "schedules_branch_id_idx" ON "schedules"("branch_id");

PRAGMA foreign_keys=ON;
