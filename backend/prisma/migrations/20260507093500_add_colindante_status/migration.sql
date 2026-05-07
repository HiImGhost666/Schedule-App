-- AlterEnum: Add 'colindante' to VacationStatus
ALTER TABLE `vacation_requests` 
  MODIFY COLUMN `status` ENUM('pending', 'colindante', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending';
