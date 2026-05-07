-- CreateEnum
CREATE TABLE `vacation_requests` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `branch_id` VARCHAR(191) NULL,
    `department_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `vacation_requests_employee_id_idx`(`employee_id`),
    INDEX `vacation_requests_status_idx`(`status`),
    INDEX `vacation_requests_branch_id_status_idx`(`branch_id`, `status`),
    INDEX `vacation_requests_department_id_status_idx`(`department_id`, `status`),
    INDEX `vacation_requests_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
