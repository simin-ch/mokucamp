-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortlistItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "campsiteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campsite" (
    "id" SERIAL NOT NULL,
    "dataset" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place" TEXT,
    "region" TEXT,
    "campsiteCategory" TEXT,
    "introduction" TEXT,
    "access" TEXT,
    "facilities" TEXT,
    "dogsAllowed" TEXT,
    "dogsAllowedBool" BOOLEAN,
    "landscape" TEXT,
    "activities" TEXT,
    "hasToilets" BOOLEAN,
    "hasWater" BOOLEAN,
    "hasPower" BOOLEAN,
    "numberOfPoweredSites" INTEGER,
    "numberOfUnpoweredSites" INTEGER,
    "bookable" BOOLEAN NOT NULL,
    "staticLink" TEXT,
    "imageUrl" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "properties" TEXT,
    "geometry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "campsiteId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "ShortlistItem_userId_idx" ON "ShortlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_userId_campsiteId_key" ON "ShortlistItem"("userId", "campsiteId");

-- CreateIndex
CREATE INDEX "Campsite_dataset_idx" ON "Campsite"("dataset");

-- CreateIndex
CREATE INDEX "Campsite_name_idx" ON "Campsite"("name");

-- CreateIndex
CREATE INDEX "Campsite_region_idx" ON "Campsite"("region");

-- CreateIndex
CREATE INDEX "Campsite_campsiteCategory_idx" ON "Campsite"("campsiteCategory");

-- CreateIndex
CREATE INDEX "Campsite_access_idx" ON "Campsite"("access");

-- CreateIndex
CREATE INDEX "Campsite_lat_lon_idx" ON "Campsite"("lat", "lon");

-- CreateIndex
CREATE UNIQUE INDEX "Campsite_dataset_sourceId_key" ON "Campsite"("dataset", "sourceId");

-- CreateIndex
CREATE INDEX "Review_campsiteId_idx" ON "Review"("campsiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_campsiteId_key" ON "Review"("userId", "campsiteId");

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_campsiteId_fkey" FOREIGN KEY ("campsiteId") REFERENCES "Campsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_campsiteId_fkey" FOREIGN KEY ("campsiteId") REFERENCES "Campsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
