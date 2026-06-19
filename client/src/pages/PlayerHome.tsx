import { Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Link as RouterLink } from 'react-router-dom';
import { portalPaths } from '../config/portals';
import { useAuth } from '../contexts/AuthContext';

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

export default function PlayerHome() {
  const { playerSteamId, hasPlayerRecord } = useAuth();
  const profilePath = playerSteamId ? `/player/${playerSteamId}` : portalPaths.player.players;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={4}>
        <Box>
          <Chip label="PLAYER HUB" size="small" color="primary" sx={{ mb: 1.5, fontWeight: 800 }} />
          <Typography variant="h3" fontWeight={900}>Sua base competitiva</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 650, mt: 1 }}>
            Perfil, time, partidas e loadout em uma experiência separada da operação do campeonato.
          </Typography>
        </Box>
        <Button component={RouterLink} to={profilePath} variant="contained" startIcon={<PersonIcon />}>
          Meu perfil
        </Button>
      </Stack>

      {!hasPlayerRecord && (
        <Card variant="outlined" sx={{ mb: 3, borderColor: 'warning.main' }}>
          <CardContent>
            <Typography fontWeight={800}>Cadastro competitivo pendente</Typography>
            <Typography color="text.secondary">
              Sua Steam está conectada, mas seu perfil ainda precisa ser cadastrado por uma organização.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        {modules.map(({ title, description, path, icon: Icon }) => (
          <Card key={path} variant="outlined">
            <CardActionArea component={RouterLink} to={path} sx={{ height: '100%', p: 1 }}>
              <CardContent>
                <Icon color="primary" sx={{ fontSize: 36, mb: 2 }} />
                <Typography variant="h6" fontWeight={800}>{title}</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
                  {description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" gap={2} alignItems="center">
              <GroupsIcon color="primary" />
              <Box>
                <Typography fontWeight={800}>Perfil e time</Typography>
                <Typography color="text.secondary" variant="body2">
                  Consulte elenco, ELO, resultados e histórico competitivo pelo seu perfil.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" gap={2} alignItems="center">
              <EmojiEventsIcon color="primary" />
              <Box>
                <Typography fontWeight={800}>Campeonatos</Typography>
                <Typography color="text.secondary" variant="body2">
                  Inscrições, check-in e calendário entram neste módulo sem misturar controles administrativos.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
