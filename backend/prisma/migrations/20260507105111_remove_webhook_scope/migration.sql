/*
  Warnings:

  - You are about to drop the column `scope` on the `webhook_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `webhook_configs` DROP COLUMN `scope`;
