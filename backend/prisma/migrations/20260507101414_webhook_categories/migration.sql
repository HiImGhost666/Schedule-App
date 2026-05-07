-- AlterTable
ALTER TABLE `webhook_configs` ADD COLUMN `branch_id` VARCHAR(191) NULL,
    ADD COLUMN `department_id` VARCHAR(191) NULL,
    ADD COLUMN `scope` ENUM('general', 'department', 'branch') NOT NULL DEFAULT 'general';

-- AddForeignKey
ALTER TABLE `webhook_configs` ADD CONSTRAINT `webhook_configs_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_configs` ADD CONSTRAINT `webhook_configs_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
