import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { SvgIconComponent } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { portalPaths } from '../config/portals';
import { useAuth } from '../contexts/AuthContext';
import { EquippedSkinsGallery } from '../components/player/EquippedSkinsGallery';
import { PageShell, SectionHeader, GlassCard, pageWidth } from '../shared/ui';

const moduleDefs = [
  {
    key: 'lobbies',
    path: portalPaths.player.lobbies,
    icon: SportsEsportsIcon,
  },
  {
    key: 'skins',
    path: portalPaths.player.inventory,
    icon: Inventory2Icon,
  },
  {
    key: 'players',
    path: portalPaths.player.players,
    icon: SearchIcon,
  },
] as const;

const highlightDefs: { key: 'profileTeam' | 'tournaments'; icon: SvgIconComponent }[] = [
  { key: 'profileTeam', icon: GroupsIcon },
  { key: 'tournaments', icon: EmojiEventsIcon },
];

export default function PlayerHome() {
  const { t } = useTranslation();
  const { playerSteamId, hasPlayerRecord } = useAuth();
  const profilePath = playerSteamId ? `/player/${playerSteamId}` : portalPaths.player.players;
  const [skinCount, setSkinCount] = useState(0);

  return (
    <PageShell maxWidth={pageWidth.default}>
      <Stack spacing={4}>
        <SectionHeader
          eyebrow={t('playerHome.eyebrow')}
          title={t('playerHome.title')}
          titleVariant="h4"
          subtitle={t('playerHome.subtitle')}
          actions={
            <Button component={RouterLink} to={profilePath} variant="contained" startIcon={<PersonIcon />}>
              {t('playerHome.myProfile')}
            </Button>
          }
        />

        {!hasPlayerRecord && (
          <GlassCard sx={{ borderColor: 'warning.main' }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <WarningAmberIcon sx={{ color: 'warning.main', mt: 0.25 }} aria-hidden />
              <Box>
                <Typography fontWeight={800}>{t('playerHome.pendingRegistration.title')}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('playerHome.pendingRegistration.description')}
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {moduleDefs.map(({ key, path, icon: Icon }) => (
            <GlassCard key={path} to={path} sx={{ height: '100%' }}>
              <Icon color="primary" sx={{ fontSize: 36, mb: 2 }} aria-hidden />
              <Typography variant="h6" fontWeight={800}>
                {t(`playerHome.modules.${key}.title`)}
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
                {t(`playerHome.modules.${key}.description`)}
              </Typography>
            </GlassCard>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          {highlightDefs.map(({ key, icon: Icon }) => (
            <GlassCard key={key}>
              <Stack direction="row" gap={2} alignItems="center">
                <Icon color="primary" aria-hidden />
                <Box>
                  <Typography fontWeight={800}>{t(`playerHome.highlights.${key}.title`)}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t(`playerHome.highlights.${key}.description`)}
                  </Typography>
                </Box>
              </Stack>
            </GlassCard>
          ))}
        </Box>

        <Box sx={{ mt: skinCount > 0 ? 0 : -2 }}>
          {skinCount > 0 && (
            <SectionHeader
              title={t('playerHome.loadout.title')}
              titleVariant="h6"
              sx={{ mb: 2 }}
              actions={
                <Button component={RouterLink} to={portalPaths.player.inventory} size="small">
                  {t('playerHome.loadout.viewAll')}
                </Button>
              }
            />
          )}
          <EquippedSkinsGallery variant="self" hideWhenEmpty grouped={false} onLoaded={setSkinCount} />
        </Box>
      </Stack>
    </PageShell>
  );
}
