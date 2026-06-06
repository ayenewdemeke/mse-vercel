-- AlterTable: make latitude and longitude optional on Project
ALTER TABLE "Project" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "longitude" DROP NOT NULL;
