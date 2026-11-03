-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "balanceReminders" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pretrip1At" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Departure" ADD COLUMN     "guaranteed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupPlace" TEXT,
ADD COLUMN     "pickupTime" TEXT,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seats" INTEGER;

-- AlterTable
ALTER TABLE "DepartureStaff" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

