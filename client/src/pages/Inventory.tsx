import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../contexts/AuthContext';
import { EquippedSkinsGallery, INVENTORY_URL } from '../components/player/EquippedSkinsGallery';

export default function Inventory() {
  const { playerSteamId } = useAuth();
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => { document.title = 'Fragbase: Skins'; }, []);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 2 }, pb: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Skins equipadas
          </Typography>
          <Typography color="text.secondary">
            Visualização sincronizada com o cstrike.app{playerSteamId ? ` · ${playerSteamId}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setReloadSignal((n) => n + 1)}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            href={INVENTORY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Equipar skins
          </Button>
        </Stack>
      </Stack>

      <EquippedSkinsGallery variant="self" reloadSignal={reloadSignal} />

      <Alert severity="info" sx={{ mt: 3 }}>
        Para trocar ou editar skins, use o cstrike.app. No servidor, digite <strong>/ws</strong> para aplicar as alterações.
      </Alert>
    </Box>
  );
}
