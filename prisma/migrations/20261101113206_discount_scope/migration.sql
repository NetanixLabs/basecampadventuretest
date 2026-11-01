-- AlterTable
ALTER TABLE "DiscountCode" ADD COLUMN     "activities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "destinations" TEXT[] DEFAULT ARRAY[]::TEXT[];
