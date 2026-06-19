import { useEffect, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../contexts/AuthContext';
import { EquippedSkinsGallery, INVENTORY_URL } from '../components/player/EquippedSkinsGallery';
import { PageShell, SectionHeader } from '../shared/ui';

export default function Inventory() {
  const { playerSteamId } = useAuth();
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => { document.title = 'Fragbase: Skins'; }, []);

  return (
    <PageShell maxWidth={1200} sx={{ px: { xs: 1, sm: 2 } }}>
      <SectionHeader
        title="Skins equipadas"
        titleVariant="h4"
        subtitle={`Visualização sincronizada com o cstrike.app${playerSteamId ? ` · ${playerSteamId}` : ''}`}
        sx={{ mb: 3 }}
        actions={
          <Stack direction="row" gap={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setReloadSignal((n) => n + 1)}>
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
        }
      />

      <EquippedSkinsGallery variant="self" reloadSignal={reloadSignal} />

      <Alert severity="info" sx={{ mt: 3 }}>
        Para trocar ou editar skins, use o cstrike.app. No servidor, digite <strong>/ws</strong> para aplicar as alterações.
      </Alert>
    </PageShell>
  );
}
