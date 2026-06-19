import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';

export const INVENTORY_URL = 'https://inventory.cstrike.app';

export interface EquippedSkin {
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

export function formatWear(wear?: number): string | null {
  if (wear === undefined) return null;
  if (wear <= 0.07) return 'Nova de Fábrica';
  if (wear <= 0.15) return 'Pouco Usada';
  if (wear <= 0.38) return 'Testada em Campo';
  if (wear <= 0.45) return 'Bem Desgastada';
  return 'Veterana de Guerra';
}

export interface EquippedSkinsGalleryProps {
  /** 'self' reads the signed-in player's inventory; 'public' reads by steamId. */
  variant?: 'self' | 'public';
  /** Required when variant === 'public'. */
  steamId?: string;
  /** When true, render nothing while loading or when there are no skins / on error (for embedding). */
  hideWhenEmpty?: boolean;
  /** Increment to force a refetch from the parent. */
  reloadSignal?: number;
  /** Called after each successful load with the number of equipped skins. */
  onLoaded?: (count: number) => void;
  /** Optional heading rendered right above the grid, only when there are skins. */
  title?: string;
}

export function EquippedSkinsGallery({
  variant = 'self',
  steamId,
  hideWhenEmpty = false,
  reloadSignal,
  onLoaded,
  title,
}: EquippedSkinsGalleryProps) {
  const [items, setItems] = useState<EquippedSkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const endpoint =
    variant === 'public' && steamId
      ? `/api/inventory/${steamId}/equipped`
      : '/api/inventory/equipped';

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as EquippedInventoryResponse;
      const loaded = data.items ?? [];
      setItems(loaded);
      onLoaded?.(loaded.length);
    } catch {
      setError(true);
      setItems([]);
      onLoaded?.(0);
    } finally {
      setLoading(false);
    }
  }, [endpoint, onLoaded]);

  useEffect(() => {
    void load();
  }, [load, reloadSignal]);

  // Embedded mode (e.g. on a profile): stay quiet unless there's something to show.
  if (hideWhenEmpty && (loading || error || items.length === 0)) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={() => void load()}>
            Tentar novamente
          </Button>
        }
      >
        Não foi possível carregar as skins do cstrike.app agora.
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
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
    );
  }

  return (
    <Box>
      {title && (
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
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
    </Box>
  );
}

export default EquippedSkinsGallery;
