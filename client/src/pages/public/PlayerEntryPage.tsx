import { useEffect } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SvgIconComponent } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { portalPaths } from '../../config/portals';
import { playerPublicNav } from '../../config/publicNav';
import { GlassCard, PageShell, pageWidth } from '../../shared/ui';

const NAV_ICONS: Record<string, SvgIconComponent> = {
  camps: EmojiEventsIcon,
  teams: GroupsIcon,
  players: SearchIcon,
  leaderboard: EmojiEventsIcon,
};

/**
 * Public player hub — directory to browse camp, teams and players (no org console).
 */
export default function PlayerEntryPage() {
  const { t } = useTranslation();
  const base = 'landing.player';
  const browseLinks = playerPublicNav.filter((item) => item.key !== 'home');

  useEffect(() => {
    document.title = `Fragbase — ${t(`${base}.title`)}`;
  }, [t]);

  return (
    <Box sx={{ flex: 1, py: { xs: 5, md: 8 } }}>
      <PageShell maxWidth={pageWidth.default}>
        <Stack spacing={{ xs: 4, md: 6 }}>
          <Stack spacing={2} sx={{ maxWidth: 640 }}>
            <Typography variant="h2" sx={{ fontSize: { xs: '2.25rem', md: '3rem' }, fontWeight: 800 }}>
              {t(`${base}.title`)}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
              {t('publicBrowse.hubSubtitle')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="large"
                startIcon={<SportsEsportsIcon />}
                data-testid="landing-primary-cta"
              >
                {t(`${base}.primaryCta`)}
              </Button>
              <Button
                component={RouterLink}
                to={portalPaths.player.camps}
                variant="outlined"
                size="large"
              >
                {t('publicBrowse.exploreCamp')}
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            }}
          >
            {browseLinks.map((item) => {
              const Icon = NAV_ICONS[item.key] ?? SearchIcon;
              return (
                <GlassCard
                  key={item.key}
                  to={item.to}
                  interactive
                  sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    {t(`publicNav.${item.key}`)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(`publicBrowse.links.${item.key}`)}
                  </Typography>
                </GlassCard>
              );
            })}
          </Box>
        </Stack>
      </PageShell>
    </Box>
  );
}
