import { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../utils/api';
import { portalPaths } from '../../../config/portals';
import { PlayerAvatar } from '../../../components/player/PlayerAvatar';
import { PlayerName } from '../../../components/player/PlayerName';
import { GlassCard, PageShell, pageWidth, publicPageShellSx } from '../../../shared/ui';

interface PublicPlayer {
  id: string;
  name: string;
  avatar?: string;
  currentElo?: number;
  isAdmin?: boolean;
}

export default function PublicPlayerPage() {
  const { steamId } = useParams<{ steamId: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<PublicPlayer | null>(null);

  useEffect(() => {
    document.title = player
      ? `Fragbase — ${player.name}`
      : `Fragbase — ${t('publicBrowse.playerPageTitle')}`;
  }, [t, player]);

  useEffect(() => {
    if (!steamId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<{ success: boolean; player?: PublicPlayer; error?: string }>(
          `/api/players/${steamId}`
        );
        if (!res.success || !res.player) {
          throw new Error(res.error || t('playerPage.playerNotFound'));
        }
        setPlayer(res.player);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('publicBrowse.loadError'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [steamId, t]);

  if (!steamId) return null;

  return (
    <PageShell maxWidth={pageWidth.content} sx={publicPageShellSx} data-testid="public-player-page">
      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <GlassCard sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" gutterBottom>{error}</Typography>
          <Button component={RouterLink} to="/player">{t('publicBrowse.findPlayers')}</Button>
        </GlassCard>
      )}

      {!loading && !error && player && (
        <Stack spacing={3}>
          <GlassCard sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
              <PlayerAvatar
                id={player.id}
                name={player.name}
                avatarUrl={player.avatar}
                size={96}
                isAdmin={player.isAdmin}
              />
              <Stack spacing={1} alignItems={{ xs: 'center', sm: 'flex-start' }}>
                <PlayerName name={player.name} isAdmin={player.isAdmin} variant="h5" />
                <Typography variant="body2" color="text.secondary">{player.id}</Typography>
                {player.currentElo != null && (
                  <Chip
                    label={t('publicBrowse.skillRating', { elo: player.currentElo })}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                <Button
                  component={RouterLink}
                  to={portalPaths.player.leaderboard}
                  variant="outlined"
                  size="small"
                >
                  {t('playerPage.viewTournamentLeaderboard')}
                </Button>
              </Stack>
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {t('publicBrowse.playerStatsHint')}
            </Typography>
            <Button component={RouterLink} to="/login" variant="contained" sx={{ mt: 2 }}>
              {t('landing.player.primaryCta')}
            </Button>
          </GlassCard>
        </Stack>
      )}
    </PageShell>
  );
}
