-- CreateEnum
CREATE TYPE "ReceiptKind" AS ENUM ('receipt', 'bill');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('guide', 'leader', 'porter', 'driver', 'cook', 'other');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "pretrip30At" TIMESTAMP(3),
ADD COLUMN     "pretrip7At" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "detailsEnc" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "ReceiptKind" NOT NULL DEFAULT 'receipt',
    "code" TEXT NOT NULL,
    "bookingId" TEXT,
    "paymentId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "items" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vatMode" TEXT NOT NULL DEFAULT 'none',
    "vat" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "paidVia" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "issuedById" TEXT,
    "issuedByName" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "signature" TEXT NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'guide',
    "phone" TEXT,
    "email" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "licenceNo" TEXT,
    "photo" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "code" TEXT NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departure" (
    "id" TEXT NOT NULL,
    "tripSlug" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartureStaff" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'guide',

    CONSTRAINT "DepartureStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPhoto" (
    "id" TEXT NOT NULL,
    "departureId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromOffice" BOOLEAN NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedList" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "trips" TEXT[],
    "token" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_code_key" ON "Receipt"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "Receipt"("paymentId");

-- CreateIndex
CREATE INDEX "Receipt_issuedAt_idx" ON "Receipt"("issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_code_key" ON "Agent"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Departure_tripSlug_startDate_key" ON "Departure"("tripSlug", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "DepartureStaff_departureId_guideId_key" ON "DepartureStaff"("departureId", "guideId");

-- CreateIndex
CREATE UNIQUE INDEX "TripPhoto_storageKey_key" ON "TripPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "TripPhoto_departureId_idx" ON "TripPhoto"("departureId");

-- CreateIndex
CREATE INDEX "PortalMessage_bookingId_createdAt_idx" ON "PortalMessage"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedList_token_key" ON "SavedList"("token");

-- CreateIndex
CREATE INDEX "SavedList_remindAt_idx" ON "SavedList"("remindAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartureStaff" ADD CONSTRAINT "DepartureStaff_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "Departure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartureStaff" ADD CONSTRAINT "DepartureStaff_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPhoto" ADD CONSTRAINT "TripPhoto_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "Departure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

