-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `rolled_back_at` DATETIME(3) NULL,
    ADD COLUMN `rolled_back_by_user_id` VARCHAR(191) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `audit_logs_updated_at_idx` ON `audit_logs`(`updated_at`);

-- CreateIndex
CREATE INDEX `audit_logs_action_idx` ON `audit_logs`(`action`);

-- CreateIndex
CREATE INDEX `audit_logs_entity_type_entity_id_idx` ON `audit_logs`(`entity_type`, `entity_id`);

-- CreateIndex
CREATE INDEX `audit_logs_user_id_created_at_idx` ON `audit_logs`(`user_id`, `created_at`);

-- CreateIndex
CREATE INDEX `branch_holidays_branch_id_is_active_idx` ON `branch_holidays`(`branch_id`, `is_active`);

-- CreateIndex
CREATE INDEX `branches_is_active_idx` ON `branches`(`is_active`);

-- CreateIndex
CREATE INDEX `notification_logs_status_idx` ON `notification_logs`(`status`);

-- CreateIndex
CREATE INDEX `notification_logs_status_sent_at_idx` ON `notification_logs`(`status`, `sent_at`);

-- CreateIndex
CREATE INDEX `notification_logs_type_idx` ON `notification_logs`(`type`);

-- CreateIndex
CREATE INDEX `refresh_tokens_expires_at_idx` ON `refresh_tokens`(`expires_at`);

-- CreateIndex
CREATE INDEX `refresh_tokens_user_id_revoked_at_idx` ON `refresh_tokens`(`user_id`, `revoked_at`);

-- CreateIndex
CREATE INDEX `schedules_branch_id_start_datetime_end_datetime_idx` ON `schedules`(`branch_id`, `start_datetime`, `end_datetime`);

-- CreateIndex
CREATE INDEX `schedules_type_idx` ON `schedules`(`type`);

-- CreateIndex
CREATE INDEX `schedules_is_last_minute_idx` ON `schedules`(`is_last_minute`);

-- CreateIndex
CREATE INDEX `theme_settings_preset_idx` ON `theme_settings`(`preset`);

-- CreateIndex
CREATE INDEX `users_status_role_idx` ON `users`(`status`, `role`);

-- CreateIndex
CREATE INDEX `users_role_idx` ON `users`(`role`);

-- CreateIndex
CREATE INDEX `users_status_idx` ON `users`(`status`);

-- CreateIndex
CREATE INDEX `webhook_configs_enabled_idx` ON `webhook_configs`(`enabled`);

-- CreateIndex
CREATE INDEX `webhook_configs_enabled_notify_modifications_idx` ON `webhook_configs`(`enabled`, `notify_modifications`);

-- CreateIndex
CREATE INDEX `webhook_configs_enabled_notify_last_minute_idx` ON `webhook_configs`(`enabled`, `notify_last_minute`);

-- CreateIndex
CREATE INDEX `webhook_configs_enabled_friday_reminder_enabled_idx` ON `webhook_configs`(`enabled`, `friday_reminder_enabled`);

-- CreateIndex
CREATE INDEX `webhook_configs_enabled_monday_vacation_reminder_enabled_idx` ON `webhook_configs`(`enabled`, `monday_vacation_reminder_enabled`);

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_rolled_back_by_user_id_fkey` FOREIGN KEY (`rolled_back_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `notification_logs` RENAME INDEX `notification_logs_webhook_config_id_fkey` TO `notification_logs_webhook_config_id_idx`;

-- RenameIndex
ALTER TABLE `refresh_tokens` RENAME INDEX `refresh_tokens_user_id_fkey` TO `refresh_tokens_user_id_idx`;

-- RenameIndex
ALTER TABLE `schedule_assignments` RENAME INDEX `schedule_assignments_user_id_fkey` TO `schedule_assignments_user_id_idx`;

-- RenameIndex
ALTER TABLE `schedules` RENAME INDEX `schedules_created_by_fkey` TO `schedules_created_by_idx`;
