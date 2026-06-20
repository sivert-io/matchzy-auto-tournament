import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../utils/api';
import { GlassCard, PageShell, pageWidth, publicPageShellSx } from '../../../shared/ui';

/**
 * Resolves the active tournament id and redirects to the public leaderboard route.
 */
export default function PublicLeaderboardRedirect() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tournamentId, setTournamentId] = useState<number | null>(null);

  useEffect(() => {
    document.title = `Fragbase — ${t('publicNav.leaderboard')}`;
  }, [t]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          tournament?: { id: number } | null;
        }>('/api/public/camp');
        if (res.success && res.tournament?.id) {
          setTournamentId(res.tournament.id);
        }
      } catch {
        // fall through to empty state
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <PageShell maxWidth={pageWidth.default} sx={publicPageShellSx}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  if (tournamentId != null) {
    return <Navigate to={`/tournament/${tournamentId}/leaderboard`} replace />;
  }

  return (
    <PageShell maxWidth={pageWidth.default} sx={publicPageShellSx}>
      <GlassCard sx={{ p: 3 }}>
        <Typography color="text.secondary">{t('publicBrowse.noTournament')}</Typography>
      </GlassCard>
    </PageShell>
  );
}
