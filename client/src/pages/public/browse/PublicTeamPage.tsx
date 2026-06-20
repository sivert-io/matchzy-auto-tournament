import { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { api } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { PlayerAvatar } from '../../../components/player/PlayerAvatar';
import { GlassCard, PageShell, pageWidth, publicPageShellSx } from '../../../shared/ui';
import type { Team } from '../../../types';

interface TeamStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export default function PublicTeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { t } = useTranslation();
  const { isAuthenticated, playerSteamId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);

  useEffect(() => {
    if (!teamId) return;
    document.title = `Fragbase — ${team?.name ?? t('publicBrowse.teamPageTitle')}`;
  }, [t, teamId, team?.name]);

  useEffect(() => {
    if (!teamId) return;
    const load = async () => {
      try {
        setLoading(true);
        const teamRes = await api.get<{ success: boolean; team?: Team; error?: string }>(
          `/api/public/teams/${teamId}`
        );
        if (!teamRes.success || !teamRes.team) {
          throw new Error(teamRes.error || t('publicBrowse.teamNotFound'));
        }
        setTeam(teamRes.team);

        try {
          const statsRes = await api.get<{ success: boolean; stats?: TeamStats }>(
            `/api/team/${teamId}/stats`
          );
          if (statsRes.success && statsRes.stats) setStats(statsRes.stats);
        } catch {
          // stats optional for public view
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('publicBrowse.loadError'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [teamId, t]);

  if (!teamId) return null;

  return (
    <PageShell maxWidth={pageWidth.content} sx={publicPageShellSx} data-testid="public-team-page">
      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <GlassCard sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
          <Button component={RouterLink} to="/teams" sx={{ mt: 2 }}>
            {t('publicBrowse.backToTeams')}
          </Button>
        </GlassCard>
      )}

      {!loading && !error && team && (
        <Stack spacing={3}>
          <GlassCard sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h4" fontWeight={800}>{team.name}</Typography>
                {team.tag && <Chip label={team.tag} size="small" />}
              </Stack>
              {stats && (
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Chip label={t('publicBrowse.matchesPlayed', { n: stats.totalMatches })} size="small" />
                  <Chip label={t('publicBrowse.wins', { n: stats.wins })} size="small" variant="outlined" />
                  <Chip label={t('publicBrowse.losses', { n: stats.losses })} size="small" variant="outlined" />
                  <Chip
                    label={t('publicBrowse.winRate', { pct: Math.round(stats.winRate * 100) })}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              )}
              {(isAuthenticated || playerSteamId) && (
                <Button
                  component={RouterLink}
                  to={`/team/${team.id}`}
                  variant="outlined"
                  size="small"
                  startIcon={<SportsEsportsIcon />}
                >
                  {t('publicBrowse.teamParticipantArea')}
                </Button>
              )}
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {t('publicBrowse.roster')}
            </Typography>
            <Stack spacing={1.5}>
              {team.players?.map((p) => (
                <Box
                  key={p.steamId}
                  component={RouterLink}
                  to={`/player/${p.steamId}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    textDecoration: 'none',
                    color: 'inherit',
                    p: 1,
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <PlayerAvatar id={p.steamId} name={p.name} avatarUrl={p.avatar} size={32} />
                  <Box>
                    <Typography fontWeight={600}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.steamId}</Typography>
                  </Box>
                </Box>
              ))}
              {!team.players?.length && (
                <Typography color="text.secondary">{t('publicBrowse.emptyRoster')}</Typography>
              )}
            </Stack>
          </GlassCard>
        </Stack>
      )}
    </PageShell>
  );
}
