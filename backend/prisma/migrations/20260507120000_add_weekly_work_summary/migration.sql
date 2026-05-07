-- CreateTable: WeeklyWorkSummary
-- Almacena el resumen de horas trabajadas por usuario y semana ISO.
-- Se recalcula cada vez que se crea, modifica o elimina un schedule.

CREATE TABLE `weekly_work_summaries` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `year` INT NOT NULL,
    `week` INT NOT NULL,
    `total_hours` DOUBLE NOT NULL DEFAULT 0,
    `base_hours` DOUBLE NOT NULL DEFAULT 40,
    `overtime_hours` DOUBLE NOT NULL DEFAULT 0,
    `daily_breakdown` TEXT NULL,
    `calculated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `weekly_work_summaries_user_id_year_week_key`(`user_id`, `year`, `week`),
    INDEX `weekly_work_summaries_user_id_year_week_idx`(`user_id`, `year`, `week`),
    INDEX `weekly_work_summaries_year_week_idx`(`year`, `week`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `weekly_work_summaries` ADD CONSTRAINT `weekly_work_summaries_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
