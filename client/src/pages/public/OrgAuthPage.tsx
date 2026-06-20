import { useEffect } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TuneIcon from '@mui/icons-material/Tune';
import SecurityIcon from '@mui/icons-material/Security';
import { AuthSignInCard } from '../../components/auth/AuthSignInCard';
import { GlassCard } from '../../shared/ui';

const FEATURES = [
  { icon: EmojiEventsIcon, key: 'tournaments' },
  { icon: BoltIcon, key: 'automation' },
  { icon: TuneIcon, key: 'control' },
] as const;

/**
 * Organizer auth entry — staff sign-in only. No player-style public browse.
 */
export default function OrgAuthPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `Fragbase — ${t('landing.organizer.title')}`;
  }, [t]);

  return (
    <Box
      id="main-content"
      sx={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        alignItems: 'stretch',
        minHeight: { md: 'calc(100vh - 64px)' },
      }}
    >
      <GlassCard
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          m: 3,
          mr: { md: 1.5 },
          p: { md: 5 },
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: 400 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AdminPanelSettingsIcon fontSize="small" />
            <Typography variant="overline" sx={{ letterSpacing: 1.5, fontWeight: 700 }}>
              {t('landing.organizer.eyebrow')}
            </Typography>
          </Stack>
          <Typography variant="h3" fontWeight={800} lineHeight={1.15}>
            {t('landing.organizer.gateTitle')}
          </Typography>
          <Typography color="text.secondary">{t('landing.organizer.gateSubtitle')}</Typography>
          <Stack spacing={1.5}>
            {FEATURES.map(({ icon: Icon, key }) => (
              <Stack key={key} direction="row" spacing={1.5} alignItems="flex-start">
                <Icon sx={{ fontSize: 20, mt: 0.25, opacity: 0.85 }} />
                <Box>
                  <Typography fontWeight={700} variant="body2">
                    {t(`landing.organizer.features.${key}.title`)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(`landing.organizer.features.${key}.desc`)}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <SecurityIcon fontSize="small" color="disabled" />
            <Typography variant="caption" color="text.secondary">
              {t('landing.organizer.secureNote')}
            </Typography>
          </Stack>
        </Stack>
      </GlassCard>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 4 },
        }}
      >
        <AuthSignInCard portal="organizer" compact />
      </Box>
    </Box>
  );
}
