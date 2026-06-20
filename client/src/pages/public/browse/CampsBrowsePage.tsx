import { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import { api } from '../../../utils/api';
import { portalPaths } from '../../../config/portals';
import { GlassCard, PageShell, pageWidth, publicPageShellSx } from '../../../shared/ui';

interface CampOverview {
  organization: { id: string; name: string; slug: string } | null;
  tournament: {
    id: number;
    name: string;
    status: string;
    type: string;
    teamIds?: string[];
  } | null;
}

export default function CampsBrowsePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CampOverview | null>(null);

  useEffect(() => {
    document.title = `Fragbase — ${t('publicBrowse.campsTitle')}`;
  }, [t]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<{
          success: boolean;
          organization?: CampOverview['organization'];
          tournament?: CampOverview['tournament'];
          error?: string;
        }>('/api/public/camp');
        if (!res.success) throw new Error(res.error || 'Failed to load camp');
        setData({ organization: res.organization ?? null, tournament: res.tournament ?? null });
      } catch (e) {
        setError(e instanceof Error ? e.message : t('publicBrowse.loadError'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [t]);

  return (
    <PageShell maxWidth={pageWidth.default} sx={publicPageShellSx}>
      <Stack spacing={1.5} sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={800}>{t('publicBrowse.campsTitle')}</Typography>
        <Typography color="text.secondary">{t('publicBrowse.campsSubtitle')}</Typography>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <GlassCard sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </GlassCard>
      )}

      {!loading && !error && data && (
        <Stack spacing={3}>
          {data.organization && (
            <GlassCard sx={{ p: 3 }}>
              <Stack spacing={1}>
                <Chip label={t('publicBrowse.campLabel')} size="small" variant="outlined" />
                <Typography variant="h5" fontWeight={700}>{data.organization.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('publicBrowse.campHint')}
                </Typography>
              </Stack>
            </GlassCard>
          )}

          {data.tournament ? (
            <GlassCard sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmojiEventsIcon color="primary" />
                  <Typography variant="h5" fontWeight={700}>{data.tournament.name}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={t(`publicBrowse.status.${data.tournament.status}`, data.tournament.status)}
                    size="small"
                  />
                  <Chip label={data.tournament.type} size="small" variant="outlined" />
                  {data.tournament.teamIds && (
                    <Chip
                      icon={<GroupsIcon />}
                      label={t('publicBrowse.teamCount', { count: data.tournament.teamIds.length })}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    component={RouterLink}
                    to={`/tournament/${data.tournament.id}/leaderboard`}
                    variant="contained"
                  >
                    {t('publicBrowse.viewLeaderboard')}
                  </Button>
                  <Button component={RouterLink} to={portalPaths.player.teams} variant="outlined">
                    {t('publicBrowse.browseTeams')}
                  </Button>
                </Stack>
              </Stack>
            </GlassCard>
          ) : (
            <GlassCard sx={{ p: 3 }}>
              <Typography color="text.secondary">{t('publicBrowse.noTournament')}</Typography>
            </GlassCard>
          )}
        </Stack>
      )}
    </PageShell>
  );
}
