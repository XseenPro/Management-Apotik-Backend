-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "deletionReason" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "deletionReason" TEXT;
