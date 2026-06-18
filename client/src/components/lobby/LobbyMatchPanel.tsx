import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useLiveStats } from '../../hooks/useLiveStats';

interface LobbyPlayerInfo {
  steamId: string;
  name: string;
}

interface LobbyMatchPanelProps {
  matchSlug: string | null;
  team1Name: string;
  team2Name: string;
  team1Players: LobbyPlayerInfo[];
  team2Players: LobbyPlayerInfo[];
  maps: string[];
  server: { name: string; host: string; port: number };
  getMapName: (id: string) => string;
  getMapImage?: (id: string) => string;
}

const STATUS_DISPLAY: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'default' }> = {
  warmup: { label: 'Warmup', color: 'info' },
  knife: { label: 'Knife Round', color: 'success' },
  live: { label: 'Live', color: 'warning' },
  halftime: { label: 'Halftime', color: 'warning' },
  postgame: { label: 'Map Finished', color: 'default' },
};

export function LobbyMatchPanel({
  matchSlug,
  team1Name,
  team2Name,
  team1Players,
  team2Players,
  maps,
  server,
  getMapName,
  getMapImage,
}: LobbyMatchPanelProps) {
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const { stats } = useLiveStats(matchSlug);

  const address = `${server.host}:${server.port}`;
  const connectCommand = `connect ${address}`;

  const t1Score = stats?.team1Score ?? 0;
  const t2Score = stats?.team2Score ?? 0;
  const currentMap = stats?.mapName || (maps[0] ? maps[0] : '');
  const mapDisplayName = currentMap ? getMapName(currentMap) : 'TBD';
  const mapNumber = (stats?.mapNumber ?? 0) + 1;
  const roundNumber = stats?.roundNumber ?? 0;
  const statusInfo = stats?.status ? STATUS_DISPLAY[stats.status] : null;

  const handleConnect = () => {
    setConnected(true);
    window.location.href = `steam://connect/${address}`;
    setTimeout(() => setConnected(false), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(connectCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Connect bar — top priority */}
          <Box display="flex" gap={1} alignItems="center">
            <Button
              variant="contained"
              color={connected ? 'success' : 'primary'}
              startIcon={<SportsEsportsIcon />}
              onClick={handleConnect}
              sx={{ flex: 1, py: 1, fontWeight: 700, borderRadius: 2 }}
            >
              {connected ? '✓ Connecting...' : 'Connect'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopy}
              sx={{ borderRadius: 2, minWidth: 0, px: 1.5 }}
            >
              {address}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary">
            {server.name}
          </Typography>

          {/* Scoreboard */}
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box flex={1} textAlign="center">
                  <Typography variant="h6" fontWeight={700} color="primary.main">{team1Name}</Typography>
                  <Typography variant="h3" fontWeight={700} color="primary.main">{t1Score}</Typography>
                </Box>
                <Box textAlign="center" px={2}>
                  <Typography variant="h5" fontWeight={700} color="text.secondary">VS</Typography>
                  {statusInfo && <Chip label={statusInfo.label} color={statusInfo.color} size="small" sx={{ mt: 0.5 }} />}
                  <Typography variant="caption" color="text.secondary" display="block">Round {roundNumber}</Typography>
                </Box>
                <Box flex={1} textAlign="center">
                  <Typography variant="h6" fontWeight={700} color="error.main">{team2Name}</Typography>
                  <Typography variant="h3" fontWeight={700} color="error.main">{t2Score}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Player stats */}
          {(() => {
            const liveT1 = stats?.playerStats?.team1 || [];
            const liveT2 = stats?.playerStats?.team2 || [];

            const buildRows = (
              livePlayers: typeof liveT1,
              lobbyPlayers: LobbyPlayerInfo[]
            ) => {
              if (livePlayers.length > 0) {
                return livePlayers.map((p) => ({
                  steamId: p.steamId, name: p.name,
                  kills: p.kills, deaths: p.deaths, assists: p.assists, damage: p.damage,
                  hasStats: true,
                }));
              }
              return lobbyPlayers.map((p) => ({
                steamId: p.steamId, name: p.name,
                kills: 0, deaths: 0, assists: 0, damage: 0, hasStats: false,
              }));
            };

            const rows1 = buildRows(liveT1, team1Players);
            const rows2 = buildRows(liveT2, team2Players);

            return (
              <Box display="flex" gap={2} flexDirection={{ xs: 'column', md: 'row' }}>
                {[
                  { team: 'team1', rows: rows1, color: 'primary.main', name: team1Name },
                  { team: 'team2', rows: rows2, color: 'error.main', name: team2Name },
                ].map(({ team, rows, color, name }) => (
                  <Box key={team} flex={1}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={600} color={color}>{name}</Typography>
                      <Typography variant="caption" color="text.disabled" fontFamily="monospace">K/D/A/DMG</Typography>
                    </Box>
                    {rows.map((p, idx) => (
                      <Box key={p.steamId} display="flex" justifyContent="space-between" alignItems="center"
                        sx={{ py: 0.5, px: 1, bgcolor: idx === 0 && p.hasStats ? 'action.selected' : 'action.hover', borderRadius: 0.5, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ flex: 1, minWidth: 0 }} noWrap>{p.name}</Typography>
                        <Typography variant="body2" color={p.hasStats ? 'text.primary' : 'text.disabled'} fontFamily="monospace" fontWeight={600}
                          sx={{ minWidth: 100, textAlign: 'right' }}>
                          {p.hasStats ? `${p.kills}/${p.deaths}/${p.assists}/${p.damage}` : '—/—/—/—'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            );
          })()}

          {/* Map image */}
          <Box
            sx={{
              position: 'relative', borderRadius: 2, overflow: 'hidden', height: 140,
              bgcolor: 'background.paper',
              backgroundImage: `url(${getMapImage ? getMapImage(currentMap) : `https://raw.githubusercontent.com/sivert-io/cs2-server-manager/master/map_thumbnails/${currentMap}.webp`})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)' }} />
            <Typography variant="h4" fontWeight={700} sx={{ position: 'relative', color: '#fff', textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
              {mapDisplayName}
            </Typography>
            <Typography variant="caption" sx={{ position: 'relative', color: 'rgba(255,255,255,0.8)' }}>
              Map {mapNumber}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
