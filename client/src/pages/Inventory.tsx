import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useAuth } from '../contexts/AuthContext';

const INVENTORY_URL = 'https://inventory.cstrike.app';

interface EquippedSkin {
  uid: string;
  id: number;
  name: string;
  imageUrl: string;
  rarity?: string;
  category?: string;
  type: string;
  nameTag?: string;
  seed?: number;
  statTrak?: number;
  wear?: number;
  teams: { ct: boolean; t: boolean };
}

interface EquippedInventoryResponse {
  items: EquippedSkin[];
  editorUrl: string;
}

function formatWear(wear?: number): string | null {
  if (wear === undefined) return null;
  if (wear <= 0.07) return 'Nova de Fábrica';
  if (wear <= 0.15) return 'Pouco Usada';
  if (wear <= 0.38) return 'Testada em Campo';
  if (wear <= 0.45) return 'Bem Desgastada';
  return 'Veterana de Guerra';
}

export default function Inventory() {
  const { playerSteamId } = useAuth();
  const [items, setItems] = useState<EquippedSkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/inventory/equipped', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as EquippedInventoryResponse;
      setItems(data.items ?? []);
    } catch {
      setError('Não foi possível carregar as skins do cstrike.app agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Fragbase: Skins';
    void loadInventory();
  }, [loadInventory]);

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
            onClick={() => void loadInventory()}
            disabled={loading}
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

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={() => void loadInventory()}>
            Tentar novamente
          </Button>
        }>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 && !error ? (
        <Card variant="outlined">
          <CardContent sx={{ py: 7, textAlign: 'center' }}>
            <Inventory2Icon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>Nenhuma skin equipada</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Escolha suas skins no cstrike.app e depois atualize esta página.
            </Typography>
            <Button variant="contained" href={INVENTORY_URL} target="_blank" rel="noopener noreferrer">
              Abrir cstrike.app
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 2,
          }}
        >
          {items.map((item) => {
            const wear = formatWear(item.wear);
            return (
              <Card
                key={item.uid}
                variant="outlined"
                sx={{
                  overflow: 'hidden',
                  borderTop: `3px solid ${item.rarity || 'divider'}`,
                  backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.04), transparent)',
                }}
              >
                <Box
                  component="img"
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', p: 2 }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Typography fontWeight={800} noWrap title={item.name}>{item.name}</Typography>
                  {item.nameTag && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      “{item.nameTag}”
                    </Typography>
                  )}
                  <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.5 }}>
                    {item.teams.ct && <Chip label="CT" size="small" color="info" />}
                    {item.teams.t && <Chip label="TR" size="small" color="warning" />}
                    {wear && <Chip label={wear} size="small" variant="outlined" />}
                    {item.statTrak !== undefined && (
                      <Chip label={`StatTrak™ ${item.statTrak}`} size="small" variant="outlined" />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        Para trocar ou editar skins, use o cstrike.app. No servidor, digite <strong>/ws</strong> para aplicar as alterações.
      </Alert>
    </Box>
  );
}
