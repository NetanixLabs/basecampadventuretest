-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "verifyHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_verifyHash_key" ON "Receipt"("verifyHash");

