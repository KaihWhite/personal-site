import { HamburgerMenu } from '@/components/HamburgerMenu';
import { PlaceholderLanding } from '@/components/PlaceholderLanding';

export default function HomePage() {
  return (
    <>
      <HamburgerMenu context="game" />
      <PlaceholderLanding />
    </>
  );
}
