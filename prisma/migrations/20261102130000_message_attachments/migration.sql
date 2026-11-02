-- AlterTable
ALTER TABLE "PortalMessage" ADD COLUMN     "fileKey" TEXT,
ADD COLUMN     "fileMime" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "PortalMessage_fileKey_key" ON "PortalMessage"("fileKey");

