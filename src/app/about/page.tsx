import { HamburgerMenu } from '@/components/HamburgerMenu';
import { SiteLogo } from '@/components/SiteLogo';
import { AboutContent } from '@/components/content/AboutContent';

export const metadata = {
  title: 'About — Kaih White',
};

export default function AboutPage() {
  return (
    <>
      <SiteLogo />
      <HamburgerMenu context="static" />
      <AboutContent />
    </>
  );
}
