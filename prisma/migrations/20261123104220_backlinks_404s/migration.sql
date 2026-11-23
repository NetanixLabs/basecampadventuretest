-- CreateTable
CREATE TABLE "MissingPage" (
    "path" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "referrers" JSONB NOT NULL DEFAULT '{}',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ignored" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MissingPage_pkey" PRIMARY KEY ("path")
);

-- CreateTable
CREATE TABLE "Backlink" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "target" TEXT,
    "anchor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unchecked',
    "rel" TEXT,
    "note" TEXT,
    "lastChecked" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Backlink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "domain" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("domain","path")
);

-- CreateIndex
CREATE INDEX "MissingPage_ignored_lastSeen_idx" ON "MissingPage"("ignored", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "Backlink_sourceUrl_key" ON "Backlink"("sourceUrl");

-- CreateIndex
CREATE INDEX "Backlink_status_idx" ON "Backlink"("status");

-- CreateIndex
CREATE INDEX "Referral_lastSeen_idx" ON "Referral"("lastSeen");
