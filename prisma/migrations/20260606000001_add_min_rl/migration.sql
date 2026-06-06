-- AlterTable: add minRl to AbutmentDesign (existing rows get default 8)
ALTER TABLE "AbutmentDesign" ADD COLUMN "minRl" DOUBLE PRECISION NOT NULL DEFAULT 8;

-- AlterTable: add minRl to WingDesign (existing rows get default 8)
ALTER TABLE "WingDesign" ADD COLUMN "minRl" DOUBLE PRECISION NOT NULL DEFAULT 8;
