import { useEffect } from 'react';
import { Box, Button, Card, Chip, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SvgIconComponent } from '@mui/icons-material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BoltIcon from '@mui/icons-material/Bolt';
import TuneIcon from '@mui/icons-material/Tune';
import { PublicTopBar } from '../components/layout/PublicTopBar';
import { PortalId, portalPaths } from '../config/portals';

interface PortalContent {
  featureKeys: string[];
  featureIcons: SvgIconComponent[];
  // Optional secondary CTA, always an internal route (no external links).
  secondary?: { to: string };
}

// Copy lives in i18n (auth.json → `landing`); this maps each portal to its
// feature blocks, icons and the secondary call-to-action target.
const PORTAL_CONTENT: Record<PortalId, PortalContent> = {
  player: {
    featureKeys: ['lobbies', 'skins', 'ranking'],
    featureIcons: [SportsEsportsIcon, Inventory2Icon, TrendingUpIcon],
    secondary: { to: portalPaths.player.players },
  },
  organizer: {
    featureKeys: ['tournaments', 'automation', 'control'],
    featureIcons: [EmojiEventsIcon, BoltIcon, TuneIcon],
  },
};

export default function Landing({ portal = 'player' }: { portal?: PortalId }) {
  const { t } = useTranslation();
  const base = `landing.${portal}`;
  const content = PORTAL_CONTENT[portal];

  useEffect(() => {
    document.title = `Fragbase — ${t(`${base}.title`)}`;
  }, [t, base]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <PublicTopBar loginLabel={t(`${base}.primaryCta`)} />

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Stack spacing={{ xs: 5, md: 7 }}>
            {/* Hero */}
            <Stack spacing={3} sx={{ maxWidth: 720 }}>
              <Chip
                label={t(`${base}.eyebrow`)}
                size="small"
                variant="outlined"
                sx={{ alignSelf: 'flex-start', letterSpacing: 0.5 }}
              />
              <Typography variant="h2" sx={{ fontSize: { xs: '2.25rem', md: '3.25rem' } }}>
                {t(`${base}.title`)}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                {t(`${base}.subtitle`)}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  size="large"
                  data-testid="landing-primary-cta"
                >
                  {t(`${base}.primaryCta`)}
                </Button>
                {content.secondary && (
                  <Button
                    component={RouterLink}
                    to={content.secondary.to}
                    variant="outlined"
                    size="large"
                  >
                    {t(`${base}.secondaryCta`)}
                  </Button>
                )}
              </Stack>
            </Stack>

            {/* Feature highlights */}
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              {content.featureKeys.map((key, i) => {
                const Icon = content.featureIcons[i];
                return (
                  <Card key={key} sx={{ p: 3, height: '100%' }}>
                    <Stack spacing={1.5}>
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
                        <Icon />
                      </Box>
                      <Typography variant="h6">{t(`${base}.features.${key}.title`)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(`${base}.features.${key}.desc`)}
                      </Typography>
                    </Stack>
                  </Card>
                );
              })}
            </Box>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
