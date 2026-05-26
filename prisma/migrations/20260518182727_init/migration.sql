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
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
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
CREATE TABLE "AbutmentExternalStability" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "yev" DOUBLE PRECISION NOT NULL,
    "ylsV" DOUBLE PRECISION NOT NULL,
    "bstemBatter" DOUBLE PRECISION NOT NULL,
    "bI" DOUBLE PRECISION NOT NULL,
    "sigmaBrg" DOUBLE PRECISION NOT NULL,
    "deltaS" DOUBLE PRECISION NOT NULL,
    "gRFill" DOUBLE PRECISION NOT NULL,
    "phiRFill" DOUBLE PRECISION NOT NULL,
    "phiFSoil" DOUBLE PRECISION NOT NULL,
    "pga" DOUBLE PRECISION NOT NULL,
    "fPgaEq" DOUBLE PRECISION NOT NULL,
    "kV" DOUBLE PRECISION NOT NULL,
    "minDesignHeight" DOUBLE PRECISION NOT NULL,
    "maxDesignHeight" DOUBLE PRECISION NOT NULL,
    "sV" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AbutmentExternalStability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WingExternalStabilityLl" (
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
    "sigmaBrg" DOUBLE PRECISION NOT NULL,
    "deltaS" DOUBLE PRECISION NOT NULL,
    "gRFill" DOUBLE PRECISION NOT NULL,
    "phiRFill" DOUBLE PRECISION NOT NULL,
    "phiFSoil" DOUBLE PRECISION NOT NULL,
    "pga" DOUBLE PRECISION NOT NULL,
    "fPgaEq" DOUBLE PRECISION NOT NULL,
    "kV" DOUBLE PRECISION NOT NULL,
    "minDesignHeight" DOUBLE PRECISION NOT NULL,
    "maxDesignHeight" DOUBLE PRECISION NOT NULL,
    "sV" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WingExternalStabilityLl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WingExternalStability" (
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
    "sigmaBrg" DOUBLE PRECISION NOT NULL,
    "deltaS" DOUBLE PRECISION NOT NULL,
    "gRFill" DOUBLE PRECISION NOT NULL,
    "phiRFill" DOUBLE PRECISION NOT NULL,
    "phiFSoil" DOUBLE PRECISION NOT NULL,
    "pga" DOUBLE PRECISION NOT NULL,
    "fPgaEq" DOUBLE PRECISION NOT NULL,
    "kV" DOUBLE PRECISION NOT NULL,
    "minDesignHeight" DOUBLE PRECISION NOT NULL,
    "maxDesignHeight" DOUBLE PRECISION NOT NULL,
    "sV" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WingExternalStability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbutmentInternalStability" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bstemBatter" DOUBLE PRECISION NOT NULL,
    "bI" DOUBLE PRECISION NOT NULL,
    "deltaS" DOUBLE PRECISION NOT NULL,
    "gRFill" DOUBLE PRECISION NOT NULL,
    "phiRFill" DOUBLE PRECISION NOT NULL,
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

    CONSTRAINT "AbutmentInternalStability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WingInternalStability" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bstemBatter" DOUBLE PRECISION NOT NULL,
    "bI" DOUBLE PRECISION NOT NULL,
    "deltaS" DOUBLE PRECISION NOT NULL,
    "gRFill" DOUBLE PRECISION NOT NULL,
    "phiRFill" DOUBLE PRECISION NOT NULL,
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

    CONSTRAINT "WingInternalStability_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "AbutmentExternalStability_designId_key" ON "AbutmentExternalStability"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "WingExternalStabilityLl_designId_key" ON "WingExternalStabilityLl"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "WingExternalStability_designId_key" ON "WingExternalStability"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "AbutmentInternalStability_designId_key" ON "AbutmentInternalStability"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "WingInternalStability_designId_key" ON "WingInternalStability"("designId");

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
ALTER TABLE "AbutmentExternalStability" ADD CONSTRAINT "AbutmentExternalStability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbutmentExternalStability" ADD CONSTRAINT "AbutmentExternalStability_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingExternalStabilityLl" ADD CONSTRAINT "WingExternalStabilityLl_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingExternalStabilityLl" ADD CONSTRAINT "WingExternalStabilityLl_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingExternalStability" ADD CONSTRAINT "WingExternalStability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingExternalStability" ADD CONSTRAINT "WingExternalStability_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbutmentInternalStability" ADD CONSTRAINT "AbutmentInternalStability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbutmentInternalStability" ADD CONSTRAINT "AbutmentInternalStability_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingInternalStability" ADD CONSTRAINT "WingInternalStability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingInternalStability" ADD CONSTRAINT "WingInternalStability_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
