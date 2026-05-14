import { HamburgerMenu } from '@/components/HamburgerMenu';
import { SiteLogo } from '@/components/SiteLogo';
import { ContactContent } from '@/components/content/ContactContent';

export const metadata = {
  title: 'Contact — Kaih White',
};

export default function ContactPage() {
  return (
    <>
      <SiteLogo />
      <HamburgerMenu context="static" />
      <ContactContent />
    </>
  );
}
