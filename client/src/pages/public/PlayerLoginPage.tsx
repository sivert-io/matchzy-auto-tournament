import { useEffect } from 'react';
import { PageShell, pageWidth, publicPageShellSx } from '../../shared/ui';
import { AuthSignInCard } from '../../components/auth/AuthSignInCard';
import { useTranslation } from 'react-i18next';

export default function PlayerLoginPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `Fragbase — ${t('login.title')}`;
  }, [t]);

  return (
    <PageShell
      maxWidth={pageWidth.narrow}
      sx={[
        publicPageShellSx,
        { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <AuthSignInCard portal="player" />
    </PageShell>
  );
}
