-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "factChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageCaption" TEXT,
ADD COLUMN     "imageCredit" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "media" JSONB,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'Draft',
ADD COLUMN     "subheadline" TEXT,
ADD COLUMN     "type" TEXT DEFAULT 'News Article',
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;
