ALTER TABLE `users`
  ADD COLUMN `password_change_policy` VARCHAR(32) NOT NULL DEFAULT 'none' AFTER `force_password_change`,
  ADD COLUMN `password_change_warned_at` DATETIME(3) NULL AFTER `password_change_policy`,
  ADD COLUMN `password_change_deadline_at` DATETIME(3) NULL AFTER `password_change_warned_at`;
