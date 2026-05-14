import { HamburgerMenu } from '@/components/HamburgerMenu';
import { SiteLogo } from '@/components/SiteLogo';
import { PortfolioContent } from '@/components/content/PortfolioContent';

export const metadata = {
  title: "Kaih's Portfolio",
};

export default function PortfolioPage() {
  return (
    <>
      <SiteLogo />
      <HamburgerMenu context="static" />
      <PortfolioContent />
    </>
  );
}
