-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "memberRoleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designTypeId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbutmentDesign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "yev" DOUBLE PRECISION NOT NULL,
    "ylsV" DOUBLE PRECISION NOT NULL,
    "bstemBatter" DOUBLE PRECISION NOT NULL,
    "bI" DOUBLE PRECISION NOT NULL,
    "deltaS" DOUBLE PRECISION NOT NULL,
    "gRFill" DOUBLE PRECISION NOT NULL,
    "phiRFill" DOUBLE PRECISION NOT NULL,
    "sigmaBrg" DOUBLE PRECISION NOT NULL,
    "phiFSoil" DOUBLE PRECISION NOT NULL,
    "pga" DOUBLE PRECISION NOT NULL,
    "fPgaEq" DOUBLE PRECISION NOT NULL,
    "kV" DOUBLE PRECISION NOT NULL,
    "phiPoGs" DOUBLE PRECISION NOT NULL,
    "alphaGs" DOUBLE PRECISION NOT NULL,
    "rcGs" DOUBLE PRECISION NOT NULL,
    "c" DOUBLE PRECISION NOT NULL,
    "phiPoGg" DOUBLE PRECISION NOT NULL,
    "phiPoGgEe" DOUBLE PRECISION NOT NULL,
    "alphaGg" DOUBLE PRECISION NOT NULL,
    "rcGg" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "maxDh" DOUBLE PRECISION NOT NULL,
    "a" DOUBLE PRECISION NOT NULL,
    "tSt" DOUBLE PRECISION NOT NULL,
    "stSg" DOUBLE PRECISION NOT NULL,
    "phiPoSg" DOUBLE PRECISION NOT NULL,
    "alphaSg" DOUBLE PRECISION NOT NULL,
    "rcSg" DOUBLE PRECISION NOT NULL,
    "bSs" DOUBLE PRECISION NOT NULL,
    "phiPoSs" DOUBLE PRECISION NOT NULL,
    "f2" DOUBLE PRECISION NOT NULL,
    "alphaSs" DOUBLE PRECISION NOT NULL,
    "sh" DOUBLE PRECISION NOT NULL,
    "minDesignHeight" DOUBLE PRECISION NOT NULL,
    "maxDesignHeight" DOUBLE PRECISION NOT NULL,
    "sV" DOUBLE PRECISION NOT NULL,
    "minRl" DOUBLE PRECISION NOT NULL DEFAULT 8,

    CONSTRAINT "AbutmentDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WingDesign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "yev" DOUBLE PRECISION NOT NULL,
    "ylsV" DOUBLE PRECISION NOT NULL,
    "bstemBatter" DOUBLE PRECISION NOT NULL,
    "theta" DOUBLE PRECISION NOT NULL,
    "bI" DOUBLE PRECISION NOT NULL,
    "deltaS" DOUBLE PRECISION NOT NULL,
    "gRFill" DOUBLE PRECISION NOT NULL,
    "phiRFill" DOUBLE PRECISION NOT NULL,
    "sigmaBrg" DOUBLE PRECISION NOT NULL,
    "phiFSoil" DOUBLE PRECISION NOT NULL,
    "pga" DOUBLE PRECISION NOT NULL,
    "fPgaEq" DOUBLE PRECISION NOT NULL,
    "kV" DOUBLE PRECISION NOT NULL,
    "phiPoGs" DOUBLE PRECISION NOT NULL,
    "alphaGs" DOUBLE PRECISION NOT NULL,
    "rcGs" DOUBLE PRECISION NOT NULL,
    "gStrip" DOUBLE PRECISION NOT NULL,
    "c" DOUBLE PRECISION NOT NULL,
    "phiPoGg" DOUBLE PRECISION NOT NULL,
    "phiPoGgEe" DOUBLE PRECISION NOT NULL,
    "alphaGg" DOUBLE PRECISION NOT NULL,
    "rcGg" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "a" DOUBLE PRECISION NOT NULL,
    "maxDh" DOUBLE PRECISION NOT NULL,
    "tSt" DOUBLE PRECISION NOT NULL,
    "stSg" DOUBLE PRECISION NOT NULL,
    "phiPoSg" DOUBLE PRECISION NOT NULL,
    "alphaSg" DOUBLE PRECISION NOT NULL,
    "rcSg" DOUBLE PRECISION NOT NULL,
    "bSs" DOUBLE PRECISION NOT NULL,
    "phiPoSs" DOUBLE PRECISION NOT NULL,
    "alphaSs" DOUBLE PRECISION NOT NULL,
    "sh" DOUBLE PRECISION NOT NULL,
    "d60" DOUBLE PRECISION NOT NULL,
    "d10" DOUBLE PRECISION NOT NULL,
    "minDesignHeight" DOUBLE PRECISION NOT NULL,
    "maxDesignHeight" DOUBLE PRECISION NOT NULL,
    "sV" DOUBLE PRECISION NOT NULL,
    "minRl" DOUBLE PRECISION NOT NULL DEFAULT 8,

    CONSTRAINT "WingDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelFaceDesign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fc" DOUBLE PRECISION NOT NULL,
    "fy" DOUBLE PRECISION NOT NULL,
    "lPanel" DOUBLE PRECISION NOT NULL,
    "hPanel" DOUBLE PRECISION NOT NULL,
    "tPanel" DOUBLE PRECISION NOT NULL,
    "ssr" DOUBLE PRECISION NOT NULL,
    "cCoverPos" DOUBLE PRECISION NOT NULL,
    "cCoverNeg" DOUBLE PRECISION NOT NULL,
    "barNumVert" DOUBLE PRECISION NOT NULL,
    "spacingVert" DOUBLE PRECISION NOT NULL,
    "barNumHor" DOUBLE PRECISION NOT NULL,
    "spacingHor" DOUBLE PRECISION NOT NULL,
    "huStr" DOUBLE PRECISION NOT NULL,
    "huEe" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PanelFaceDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRole_name_key" ON "MemberRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_projectId_key" ON "Member"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignType_key_key" ON "DesignType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AbutmentDesign_designId_key" ON "AbutmentDesign"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "WingDesign_designId_key" ON "WingDesign"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "PanelFaceDesign_designId_key" ON "PanelFaceDesign"("designId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_memberRoleId_fkey" FOREIGN KEY ("memberRoleId") REFERENCES "MemberRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_designTypeId_fkey" FOREIGN KEY ("designTypeId") REFERENCES "DesignType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbutmentDesign" ADD CONSTRAINT "AbutmentDesign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbutmentDesign" ADD CONSTRAINT "AbutmentDesign_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingDesign" ADD CONSTRAINT "WingDesign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingDesign" ADD CONSTRAINT "WingDesign_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelFaceDesign" ADD CONSTRAINT "PanelFaceDesign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelFaceDesign" ADD CONSTRAINT "PanelFaceDesign_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
