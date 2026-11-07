-- AlterEnum
ALTER TYPE "ReceiptKind" ADD VALUE 'credit';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "docReminders" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "docsDone" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "reminder2SentAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "creditForId" TEXT,
ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "BookingAccess" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingList" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "packed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extra" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "travellerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideLeave" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "from" DATE NOT NULL,
    "to" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinderAnswer" (
    "id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "results" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinderAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitDay" (
    "day" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisitDay_pkey" PRIMARY KEY ("day","source")
);

-- CreateIndex
CREATE INDEX "BookingAccess_travellerId_idx" ON "BookingAccess"("travellerId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAccess_bookingId_travellerId_key" ON "BookingAccess"("bookingId", "travellerId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingList_bookingId_travellerId_key" ON "PackingList"("bookingId", "travellerId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_travellerId_idx" ON "PushSubscription"("travellerId");

-- CreateIndex
CREATE INDEX "Notification_travellerId_createdAt_idx" ON "Notification"("travellerId", "createdAt");

-- CreateIndex
CREATE INDEX "GuideLeave_from_to_idx" ON "GuideLeave"("from", "to");

-- CreateIndex
CREATE INDEX "FinderAnswer_createdAt_idx" ON "FinderAnswer"("createdAt");

-- AddForeignKey
ALTER TABLE "BookingAccess" ADD CONSTRAINT "BookingAccess_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAccess" ADD CONSTRAINT "BookingAccess_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideLeave" ADD CONSTRAINT "GuideLeave_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "BookingAccess" ADD COLUMN     "detailsEnc" TEXT;
