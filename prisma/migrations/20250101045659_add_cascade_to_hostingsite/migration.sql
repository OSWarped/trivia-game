-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_hostingSiteId_fkey";

-- DropForeignKey
ALTER TABLE "SiteRole" DROP CONSTRAINT "SiteRole_siteId_fkey";

-- AddForeignKey
ALTER TABLE "SiteRole" ADD CONSTRAINT "SiteRole_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "HostingSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_hostingSiteId_fkey" FOREIGN KEY ("hostingSiteId") REFERENCES "HostingSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
