PRAGMA foreign_keys=OFF;

ALTER TABLE "users" ADD COLUMN "branch_id" TEXT REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "users_branch_id_idx" ON "users"("branch_id");

PRAGMA foreign_keys=ON;
