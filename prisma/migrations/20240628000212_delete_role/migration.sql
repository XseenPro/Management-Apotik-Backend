/*
  Warnings:

  - You are about to drop the column `roleName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleName_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "roleName";

-- DropTable
DROP TABLE "Role";
