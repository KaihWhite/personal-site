import Link from 'next/link';
import styles from './SiteLogo.module.scss';

interface SiteLogoProps {
  hidden?: boolean;
}

export function SiteLogo({ hidden = false }: SiteLogoProps) {
  return (
    <Link href="/" className={hidden ? styles.hidden : styles.logo} aria-label="Back to the world">
      KW
    </Link>
  );
}
