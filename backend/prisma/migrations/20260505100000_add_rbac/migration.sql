-- DropIndex
DROP INDEX `users_role_idx` ON `users`;

-- DropIndex
DROP INDEX `users_status_role_idx` ON `users`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `role`,
    ADD COLUMN `role_id` VARCHAR(191) NULL,
    MODIFY `password_change_policy` VARCHAR(191) NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PermissionToRole` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PermissionToRole_AB_unique`(`A`, `B`),
    INDEX `_PermissionToRole_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `refresh_tokens_user_id_idx` ON `refresh_tokens`(`user_id`);

-- CreateIndex
CREATE INDEX `users_status_role_id_idx` ON `users`(`status`, `role_id`);

-- CreateIndex
CREATE INDEX `users_role_id_idx` ON `users`(`role_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissionToRole` ADD CONSTRAINT `_PermissionToRole_A_fkey` FOREIGN KEY (`A`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissionToRole` ADD CONSTRAINT `_PermissionToRole_B_fkey` FOREIGN KEY (`B`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `notification_logs` RENAME INDEX `notification_logs_webhook_config_id_fkey` TO `notification_logs_webhook_config_id_idx`;

-- RenameIndex
ALTER TABLE `schedule_assignments` RENAME INDEX `schedule_assignments_user_id_fkey` TO `schedule_assignments_user_id_idx`;

-- RenameIndex
ALTER TABLE `schedules` RENAME INDEX `schedules_created_by_fkey` TO `schedules_created_by_idx`;
