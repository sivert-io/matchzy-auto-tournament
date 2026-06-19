import React from 'react';
import { Typography, Box, Chip } from '@mui/material';
import type { MapPool, Map as MapType } from '../../types/api.types';
import { GlassCard } from '../../shared/ui';

interface MapPoolCardProps {
  pool: MapPool;
  maps: MapType[];
  onClick: (pool: MapPool) => void;
}

export function MapPoolCard({ pool, maps, onClick }: MapPoolCardProps) {
  const getMapDisplayName = (mapId: string): string => {
    const map = maps.find((m) => m.id === mapId);
    return map ? map.displayName : mapId;
  };

  const mapIds = pool.mapIds ?? [];

  return (
    <GlassCard
      interactive
      onClick={() => onClick(pool)}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: pool.enabled ? 1 : 0.7,
        '&:hover': { transform: 'translateY(-4px)' },
      }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            {pool.name}
          </Typography>
          <Box display="flex" gap={0.5}>
            {pool.isDefault && <Chip label="Default" size="small" color="primary" />}
            {!pool.enabled && <Chip label="Disabled" size="small" color="default" variant="outlined" />}
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {mapIds.length} map{mapIds.length !== 1 ? 's' : ''}
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {mapIds.slice(0, 5).map((mapId) => (
            <Chip key={mapId} label={getMapDisplayName(mapId)} size="small" variant="outlined" />
          ))}
          {mapIds.length > 5 && (
            <Chip label={`+${mapIds.length - 5} more`} size="small" variant="outlined" />
          )}
        </Box>
      </Box>
    </GlassCard>
  );
}
