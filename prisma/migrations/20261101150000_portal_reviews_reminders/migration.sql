-- CreateEnum
CREATE TYPE "TravellerStatus" AS ENUM ('invited', 'active', 'disabled', 'expired');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "detailsEnc" TEXT,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "reviewTokenHash" TEXT,
ADD COLUMN     "travellerId" TEXT;

-- CreateTable
CREATE TABLE "Traveller" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "TravellerStatus" NOT NULL DEFAULT 'invited',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Traveller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravellerSession" (
    "id" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravellerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravellerToken" (
    "id" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravellerToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravellerFile" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravellerFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "tripSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "TripReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Traveller_email_key" ON "Traveller"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TravellerSession_tokenHash_key" ON "TravellerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "TravellerSession_travellerId_idx" ON "TravellerSession"("travellerId");

-- CreateIndex
CREATE UNIQUE INDEX "TravellerToken_tokenHash_key" ON "TravellerToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "TravellerFile_storageKey_key" ON "TravellerFile"("storageKey");

-- CreateIndex
CREATE INDEX "TravellerFile_bookingId_idx" ON "TravellerFile"("bookingId");

-- CreateIndex
CREATE INDEX "TripReview_status_createdAt_idx" ON "TripReview"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reviewTokenHash_key" ON "Booking"("reviewTokenHash");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravellerSession" ADD CONSTRAINT "TravellerSession_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravellerToken" ADD CONSTRAINT "TravellerToken_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravellerFile" ADD CONSTRAINT "TravellerFile_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

