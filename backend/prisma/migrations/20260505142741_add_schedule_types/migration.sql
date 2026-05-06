-- AlterTable
ALTER TABLE `schedules` ADD COLUMN `schedule_type_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `schedule_types` (
    `id` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `schedule_types_value_key`(`value`),
    INDEX `schedule_types_value_idx`(`value`),
    INDEX `schedule_types_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `schedules_schedule_type_id_idx` ON `schedules`(`schedule_type_id`);

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_schedule_type_id_fkey` FOREIGN KEY (`schedule_type_id`) REFERENCES `schedule_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
