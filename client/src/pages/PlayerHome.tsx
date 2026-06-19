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
import { portalPaths } from '../config/portals';
import { useAuth } from '../contexts/AuthContext';
import { EquippedSkinsGallery } from '../components/player/EquippedSkinsGallery';
import { PageShell, SectionHeader, GlassCard } from '../shared/ui';

const modules = [
  {
    title: 'Lobbies',
    description: 'Encontre partidas, entre na fila e acompanhe sua sala.',
    path: portalPaths.player.lobbies,
    icon: SportsEsportsIcon,
  },
  {
    title: 'Skins',
    description: 'Veja seu loadout sincronizado e edite no cstrike.app.',
    path: portalPaths.player.inventory,
    icon: Inventory2Icon,
  },
  {
    title: 'Jogadores',
    description: 'Busque jogadores, perfis, histórico e estatísticas.',
    path: portalPaths.player.players,
    icon: SearchIcon,
  },
] as const;

const highlights: { title: string; description: string; icon: SvgIconComponent }[] = [
  {
    title: 'Perfil e time',
    description: 'Consulte elenco, ELO, resultados e histórico competitivo pelo seu perfil.',
    icon: GroupsIcon,
  },
  {
    title: 'Campeonatos',
    description: 'Inscrições, check-in e calendário entram neste módulo sem misturar controles administrativos.',
    icon: EmojiEventsIcon,
  },
];

export default function PlayerHome() {
  const { playerSteamId, hasPlayerRecord } = useAuth();
  const profilePath = playerSteamId ? `/player/${playerSteamId}` : portalPaths.player.players;
  const [skinCount, setSkinCount] = useState(0);

  return (
    <PageShell>
      <Stack spacing={4}>
        <SectionHeader
          eyebrow="Player hub"
          title="Sua base competitiva"
          titleVariant="h4"
          subtitle="Perfil, time, partidas e loadout em uma experiência separada da operação do campeonato."
          actions={
            <Button component={RouterLink} to={profilePath} variant="contained" startIcon={<PersonIcon />}>
              Meu perfil
            </Button>
          }
        />

        {!hasPlayerRecord && (
          <GlassCard sx={{ borderColor: 'warning.main' }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <WarningAmberIcon sx={{ color: 'warning.main', mt: 0.25 }} />
              <Box>
                <Typography fontWeight={800}>Cadastro competitivo pendente</Typography>
                <Typography color="text.secondary" variant="body2">
                  Sua Steam está conectada, mas seu perfil ainda precisa ser cadastrado por uma organização.
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {modules.map(({ title, description, path, icon: Icon }) => (
            <GlassCard key={path} to={path} sx={{ height: '100%' }}>
              <Icon color="primary" sx={{ fontSize: 36, mb: 2 }} />
              <Typography variant="h6" fontWeight={800}>
                {title}
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
                {description}
              </Typography>
            </GlassCard>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          {highlights.map(({ title, description, icon: Icon }) => (
            <GlassCard key={title}>
              <Stack direction="row" gap={2} alignItems="center">
                <Icon color="primary" />
                <Box>
                  <Typography fontWeight={800}>{title}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {description}
                  </Typography>
                </Box>
              </Stack>
            </GlassCard>
          ))}
        </Box>

        {/* Equipped-skins preview for the signed-in player. Stays hidden when there
            are no skins, Steam isn't connected, or cstrike.app is unreachable. */}
        <Box sx={{ mt: skinCount > 0 ? 0 : -2 }}>
          {skinCount > 0 && (
            <SectionHeader
              title="Seu loadout"
              titleVariant="h6"
              sx={{ mb: 2 }}
              actions={
                <Button component={RouterLink} to={portalPaths.player.inventory} size="small">
                  Ver todas
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
