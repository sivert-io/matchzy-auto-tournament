import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
  Avatar,
  Stack,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  FormControl,
  InputLabel,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Popover,
  Select,
  TextField,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LobbyMatchPanel } from '../components/lobby/LobbyMatchPanel';
// AdminMatchControls moved inline to sidebar
import MapIcon from '@mui/icons-material/Map';
import StarIcon from '@mui/icons-material/Star';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LogoutIcon from '@mui/icons-material/Logout';
// SmartToyIcon removed — sidebar uses text-only buttons
// AutoFixHighIcon removed — shuffle uses text-only
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
// Accordion removed — match controls inline in sidebar
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useIsDevelopment } from '../hooks/useIsDevelopment';
import type { Lobby, LobbyPlayer, GameMode } from '../types/lobby.types';
import io from 'socket.io-client';

interface MapItem {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

interface MapPool {
  id: number;
  name: string;
  maps: string[];
  isDefault?: boolean;
}

function getFaceitColor(level: number): string {
  const colors: Record<number, string> = {
    1: '#EEE', 2: '#1CE400', 3: '#1CE400',
    4: '#FFC800', 5: '#FFC800', 6: '#FFC800',
    7: '#FF6309', 8: '#FF6309',
    9: '#EE4B2B', 10: '#EE4B2B',
  };
  return colors[level] || '#666';
}


export default function LobbyRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playerSteamId } = useAuth();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const { showError, showSuccess } = useSnackbar();
  const [executing, setExecuting] = useState(false);
  const [forceServerId, setForceServerId] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; title: string; message: string } | null>(null);
  const [playerMenu, setPlayerMenu] = useState<{ steamId: string; x: number; y: number } | null>(null);
  const [startMenuPos, setStartMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [debugJson, setDebugJson] = useState<string | null>(null);
  useIsDevelopment(); // keep hook call order stable
  const { isRealAdmin } = useAuth();

  const [gameModes, setGameModes] = useState<GameMode[]>([]);
  const [allMaps, setAllMaps] = useState<MapItem[]>([]);
  const [mapPools, setMapPools] = useState<MapPool[]>([]);
  const [servers, setServers] = useState<{ id: string; name: string; host: string; port: number; status: string }[]>([]);
  const [faceitData, setFaceitData] = useState<Record<string, { faceitElo: number; skillLevel: number; nickname: string }>>({});
  const [vetoEnabled, setVetoEnabled] = useState(true);

  const loadLobby = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.fetch(`/api/lobbies/${id}`);
      setLobby(res.lobby);
    } catch {
      showError('Failed to load lobby');
    }
  }, [id]);

  useEffect(() => {
    loadLobby();
    const socket = io({ transports: ['websocket'] });
    socket.on(`lobby:update:${id}`, (updated: Lobby) => setLobby(updated));
    socket.on('lobby:deleted', (data: { id: string }) => {
      if (data.id === id) {
        showError('Lobby was cancelled');
        setTimeout(() => navigate('/lobby'), 2000);
      }
    });
    return () => { socket.disconnect(); };
  }, [id, navigate, loadLobby]);

  useEffect(() => {
    const load = async () => {
      const [mapsRes, modesRes, poolsRes, serversRes] = await Promise.allSettled([
        api.fetch('/api/lobbies/maps'),
        api.fetch('/api/lobbies/game-modes'),
        api.fetch('/api/lobbies/map-pools'),
        api.fetch('/api/lobbies/servers/list'),
      ]);
      if (mapsRes.status === 'fulfilled') setAllMaps(mapsRes.value.maps || []);
      if (modesRes.status === 'fulfilled') setGameModes(modesRes.value.gameModes || []);
      if (poolsRes.status === 'fulfilled') setMapPools(poolsRes.value.mapPools || []);
      if (serversRes.status === 'fulfilled') setServers(serversRes.value.servers || []);
    };
    load();
  }, []);

  // Fetch FACEIT data when players change
  useEffect(() => {
    if (!lobby) return;
    const steamIds = lobby.state.players
      .filter((p) => !p.steamId.startsWith('BOT_'))
      .map((p) => p.steamId);
    if (steamIds.length === 0) return;
    const key = steamIds.sort().join(',');
    api.fetch(`/api/lobbies/faceit/players?steamIds=${key}`)
      .then((res) => { if (res.players) setFaceitData(res.players); })
      .catch(() => { /* ignore */ });
  }, [lobby?.state.players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const veto = lobby?.state.veto;

  // Veto countdown timer
  const [vetoCountdown, setVetoCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (!veto?.turnDeadline || veto.completed) { setVetoCountdown(null); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((veto.turnDeadline! - Date.now()) / 1000));
      setVetoCountdown(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [veto?.turnDeadline, veto?.completed]);

  if (!lobby) {
    return (
      <Box p={4}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const me = lobby.state.players.find((p) => p.steamId === playerSteamId);
  const isCreator = lobby.createdBy === playerSteamId;
  const isMyPickTurn = lobby.status === 'picking' && lobby.state.pickTurn &&
    lobby.state.captains[lobby.state.pickTurn] === playerSteamId;
  const myCaptainTeam =
    lobby.state.captains.team1 === playerSteamId ? 'team1' :
    lobby.state.captains.team2 === playerSteamId ? 'team2' : null;
  const matchOver = lobby.matchStatus === 'completed' || lobby.matchStatus === 'cancelled' || lobby.status === 'cancelled';
  const isMyVetoTurn = lobby.status === 'veto' && veto && !veto.completed && myCaptainTeam === veto.currentTurn;

  const team1Players = lobby.state.players.filter((p) => p.team === 'team1');
  const team2Players = lobby.state.players.filter((p) => p.team === 'team2');
  const unassigned = lobby.state.players.filter((p) => p.team === 'unassigned');
  const maxPlayers = lobby.teamSize * 2;

  const quickActions = new Set(['join-team', 'set-captain', 'kick', 'shuffle-teams', 'auto-assign']);

  const act = async (action: string, body?: Record<string, unknown>) => {
    if (!quickActions.has(action)) setExecuting(true);
    try {
      const endpoint = `/api/lobbies/${id}/${action}`;
      const res = await api.fetch(endpoint, {
        method: action === 'cancel' ? 'DELETE' : 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.lobby) setLobby(res.lobby);
      return res;
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Action failed';
      try { const parsed = JSON.parse(msg); msg = parsed.error || parsed.message || msg; } catch { /* not JSON */ }
      showError(msg);
      return null;
    } finally {
      setExecuting(false);
    }
  };

  const handleJoinTeam = (team: 'team1' | 'team2' | 'unassigned') => act('join-team', { team });
  const handleSetCaptain = (targetId: string, team: 'team1' | 'team2') =>
    act('set-captain', { targetId, team });
  const handleKick = (targetId: string) => act('kick', { targetId });
  const handlePick = (targetId: string) => act('pick', { targetId });
  const handleTransferOwnership = (targetId: string) => act('transfer-ownership', { targetId });
  const handleStartVeto = () => act('start-veto');
  const handleVetoAction = (mapId: string) => {
    if (!veto) return;
    act('veto-action', { mapId, action: veto.currentAction });
  };
  const handleLeave = () => setConfirmAction({ type: 'leave', title: 'Leave Lobby', message: 'Are you sure you want to leave this lobby?' });
  const handleCancel = () => setConfirmAction({ type: 'cancel', title: 'Cancel Lobby', message: 'Are you sure you want to cancel this lobby? If a match is in progress, it will be force-cancelled on the server.' });
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'leave') {
      await act('leave');
      navigate('/lobby');
    } else if (confirmAction.type === 'end-match') {
      await rconCmd('css_restart', 'Match ended');
      if (lobby?.matchSlug) {
        try { await api.fetch(`/api/matches/${lobby.matchSlug}/force-cancel`, { method: 'POST' }); } catch { /* best effort */ }
      }
      // Set lobby status to cancelled
      try { await api.fetch(`/api/lobbies/${id}`, { method: 'DELETE' }); } catch { /* best effort */ }
      await loadLobby();
    } else if (confirmAction.type === 'cancel') {
      // If a match is running, force-cancel it on the server first
      if (lobby?.matchSlug) {
        try {
          await api.fetch(`/api/matches/${lobby.matchSlug}/force-cancel`, { method: 'POST' });
        } catch { /* best effort */ }
      }
      await api.fetch(`/api/lobbies/${id}`, { method: 'DELETE' });
      navigate('/lobby');
    }
    setConfirmAction(null);
  };
  const handleUpdateConfig = (config: Record<string, unknown>) => act('update-config', config);

  const getMapName = (mapId: string) => allMaps.find((m) => m.id === mapId)?.displayName || mapId;

  const renderPlayer = (player: LobbyPlayer) => {
    const isPickable = lobby.status === 'picking' && player.team === 'unassigned' && isMyPickTurn;
    const isHost = player.steamId === lobby.createdBy;

    return (
      <Paper
        key={player.steamId}
        sx={{
          p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
          height: 54, boxSizing: 'border-box',
          border: '1px solid',
          borderColor: isPickable ? 'primary.main' : 'divider',
          bgcolor: isPickable ? 'rgba(255, 122, 26, 0.06)' : 'background.paper',
          cursor: isPickable ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: isPickable ? 'primary.light' : 'text.disabled',
            transform: isPickable ? 'scale(1.02)' : 'none',
            boxShadow: 1,
          },
        }}
        onClick={isPickable ? () => handlePick(player.steamId) : undefined}
      >
        <Avatar src={player.avatar} alt={player.name} sx={{ width: 36, height: 36 }}>
          {player.name[0]}
        </Avatar>
        <Box flex={1} minWidth={0} display="flex" alignItems="center" gap={0.75}>
          <Typography variant="body2" fontWeight={600} noWrap>{player.name}</Typography>
          {isHost && (
            <Typography variant="caption" sx={{ fontFamily: '"Rajdhani", sans-serif', color: 'text.disabled', fontWeight: 600, fontSize: '0.7rem' }}>
              Host
            </Typography>
          )}
        </Box>
        {faceitData[player.steamId] && (
          <Box display="flex" alignItems="center" gap={0.5} sx={{ mr: 0.5 }}>
            <Box
              component="img"
              src={`https://cdn-frontend.faceit-cdn.net/web/static/media/assets_images_skill-icons_skill_level_${faceitData[player.steamId].skillLevel}_svg.svg`}
              alt={`Level ${faceitData[player.steamId].skillLevel}`}
              sx={{ width: 22, height: 22 }}
            />
            <Typography variant="caption" fontWeight={700} sx={{ fontFamily: '"Rajdhani", sans-serif', fontSize: '0.8rem', color: getFaceitColor(faceitData[player.steamId].skillLevel) }}>
              {faceitData[player.steamId].faceitElo}
            </Typography>
          </Box>
        )}
        {player.isCaptain && (
          <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
        )}
        {isCreator && player.steamId !== playerSteamId && lobby.status === 'waiting' && (
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setPlayerMenu({ steamId: player.steamId, x: rect.right, y: rect.top }); }}
            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Paper>
    );
  };

  const getTeamName = (team: 'team1' | 'team2') => {
    const customName = team === 'team1' ? lobby.state.team1Name : lobby.state.team2Name;
    if (customName) return customName;
    const captainId = lobby.state.captains[team];
    if (captainId) {
      const captain = lobby.state.players.find((p) => p.steamId === captainId);
      if (captain) return `team_${captain.name.replace(/\s+/g, '')}`;
    }
    return team === 'team1' ? 'Team 1' : 'Team 2';
  };

  const canJoinTeams = lobby.status === 'waiting' && !matchOver;

  const TeamColumn = ({ team, players, color }: { team: 'team1' | 'team2'; players: LobbyPlayer[]; color: string }) => {
    const slots = Array.from({ length: lobby.teamSize }, (_, i) => players[i] || null);
    const canIJoin = canJoinTeams && me && me.team !== team && !me.isCaptain && players.length < lobby.teamSize;
    const canNewJoin = canJoinTeams && !me && players.length < lobby.teamSize;

    return (
      <Box flex={1}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <Box sx={{ width: 4, height: 28, borderRadius: 1, bgcolor: color }} />
          <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"Rajdhani", sans-serif' }}>{getTeamName(team)}</Typography>
          <Chip label={`${players.length}/${lobby.teamSize}`} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }} />
          {lobby.status === 'picking' && lobby.state.pickTurn === team && (
            <Chip label="Picking..." color="warning" size="small" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700, animation: 'pulse 1.5s infinite' }} />
          )}
        </Box>
        <Stack spacing={1}>
          {slots.map((player, i) =>
            player ? (
              renderPlayer(player)
            ) : (
              <Paper
                key={`empty-${i}`}
                onClick={(canIJoin || canNewJoin) ? () => handleJoinTeam(team) : undefined}
                sx={{
                  p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 54, boxSizing: 'border-box',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: (canIJoin || canNewJoin) ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  '&:hover': (canIJoin || canNewJoin) ? {
                    borderColor: color,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    transform: 'scale(1.01)',
                  } : {},
                }}
              >
                {(canIJoin || canNewJoin) ? (
                  <Typography variant="h5" color="text.disabled" fontWeight={300}>+</Typography>
                ) : (
                  <Typography variant="body2" color="text.disabled">—</Typography>
                )}
              </Paper>
            )
          )}
        </Stack>
      </Box>
    );
  };

  // Sidebar panel (sticky, follows scroll)
  const BTN = { height: 34, borderRadius: 1, fontSize: '0.8rem' } as const;
  const SECTION = { fontSize: '0.65rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' as const, letterSpacing: '0.08em', mt: 1 };

  const rconCmd = async (cmd: string, successMsg: string) => {
    if (!lobby.server) return;
    try {
      await api.fetch('/api/rcon/command', { method: 'POST', body: JSON.stringify({ serverIds: [lobby.server.id], command: 'custom', value: cmd }) });
      showSuccess(successMsg);
    } catch (err) { showError((err as Error).message); }
  };

  const sidePanelContent = (
    <Card sx={{ width: 240, flexShrink: 0 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={0.75}>
          {/* Leave + Cancel */}
          <Box display="flex" justifyContent="flex-end" gap={0.5} alignItems="center">
            {me && !matchOver && (
              <Tooltip title="Leave Lobby">
                <IconButton color="error" onClick={handleLeave} disabled={executing} sx={{ width: 28, height: 28, borderRadius: 1 }}>
                  <LogoutIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {isCreator && !matchOver && (
              <Tooltip title="Cancel Lobby">
                <IconButton color="error" onClick={handleCancel} disabled={executing} sx={{ width: 28, height: 28, borderRadius: 1 }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {matchOver && isRealAdmin && (
              <Button variant="text" size="small" color="error" onClick={handleCancel} disabled={executing} fullWidth>Remove</Button>
            )}
          </Box>

          {/* Config — waiting phase */}
          {lobby.status === 'waiting' && (
            <>
              <Typography sx={SECTION}>Config</Typography>
              <Divider />
              <FormControl size="small" fullWidth disabled={!isCreator}>
                <InputLabel>Mode</InputLabel>
                <Select value={lobby.gameMode} label="Mode" onChange={(e) => handleUpdateConfig({ gameMode: e.target.value })}>
                  {gameModes.map((mode) => (<MenuItem key={mode.id} value={mode.id}>{mode.name}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth disabled={!isCreator}>
                <InputLabel>Format</InputLabel>
                <Select value={lobby.format} label="Format" onChange={(e) => handleUpdateConfig({ format: e.target.value })}>
                  <MenuItem value="bo1">BO1</MenuItem>
                  <MenuItem value="bo3">BO3</MenuItem>
                  <MenuItem value="bo5">BO5</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth disabled={!isCreator}>
                <InputLabel>Per team</InputLabel>
                <Select value={lobby.teamSize} label="Per team" onChange={(e) => handleUpdateConfig({ teamSize: Number(e.target.value) })}>
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (<MenuItem key={n} value={n}>{n}v{n}</MenuItem>))}
                </Select>
              </FormControl>

              {isCreator && (
                <Button variant="outlined" fullWidth onClick={() => act('shuffle-teams')} disabled={executing} sx={BTN}>Shuffle Teams</Button>
              )}
              {isRealAdmin && isCreator && (
                <Button variant="outlined" fullWidth color="warning" onClick={() => act('fill-bots')} disabled={executing || lobby.state.players.length >= maxPlayers} sx={BTN}>Fill Bots</Button>
              )}
            </>
          )}

          {/* Match controls — when match is active */}
          {isCreator && lobby.matchSlug && lobby.server && !matchOver && (
            <>
              <Typography sx={SECTION}>Match</Typography>
              <Divider />
              <Button variant="outlined" fullWidth onClick={async () => {
                try { await api.fetch(`/api/matches/${lobby.matchSlug}/load`, { method: 'POST' }); showSuccess('Config resent'); } catch (err) { showError((err as Error).message); }
              }} disabled={executing} sx={BTN}>Resend Config</Button>
              <Button variant="outlined" fullWidth onClick={() => rconCmd('css_forcepause', 'Match paused')} disabled={executing} sx={BTN}>Pause</Button>
              <Button variant="outlined" fullWidth onClick={() => rconCmd('css_forceunpause', 'Match unpaused')} disabled={executing} sx={BTN}>Unpause</Button>
              <Button variant="outlined" fullWidth onClick={() => rconCmd('css_switch', 'Teams swapped')} disabled={executing} sx={BTN}>Swap Teams</Button>
              <Button variant="outlined" fullWidth onClick={() => rconCmd('mp_restartgame 1', 'Round restarted')} disabled={executing} sx={BTN}>Restart Round</Button>
            </>
          )}

          {/* Admin controls */}
          {isCreator && lobby.matchSlug && lobby.server && !matchOver && (
            <>
              <Typography sx={SECTION}>Admin</Typography>
              <Divider />
              <Button variant="outlined" fullWidth color="warning" onClick={() => rconCmd('css_restart', 'Rebooting...')} disabled={executing} sx={BTN}>Reboot Server</Button>
              <Button variant="outlined" fullWidth color="warning" onClick={() => rconCmd('css_skipveto', 'Veto skipped')} disabled={executing} sx={BTN}>Skip Veto</Button>
              <Button variant="outlined" fullWidth color="warning" onClick={() => rconCmd('mp_warmup_end', 'Warmup ended')} disabled={executing} sx={BTN}>End Warmup</Button>
              <Button variant="outlined" fullWidth color="error" onClick={() => setConfirmAction({ type: 'end-match', title: 'End Match', message: 'Are you sure you want to end this match? This cannot be undone.' })} disabled={executing} sx={BTN}>End Match</Button>
            </>
          )}

          {/* Admin: View JSON */}
          {isRealAdmin && lobby.matchSlug && (
            <>
              <Typography sx={SECTION}>Debug</Typography>
              <Divider />
              <Button variant="outlined" fullWidth color="warning" onClick={async () => {
                try { const res = await api.fetch(`/api/matches/${lobby.matchSlug}`); setDebugJson(JSON.stringify(res.match?.config || res.match || res, null, 2)); } catch (err) { setDebugJson(String(err)); }
              }} sx={BTN}>View JSON</Button>
            </>
          )}

          {/* Start button */}
          {isCreator && !matchOver && (
            <>
              <Box sx={{ mt: 1 }} />
              <ButtonGroup variant="contained" color="success" fullWidth sx={{ height: 44, borderRadius: 1, '& .MuiButton-root': { borderRadius: 1 } }}>
                <Button
                  onClick={handleStartVeto}
                  disabled={executing || !(lobby.status === 'waiting' && team1Players.length > 0 && team2Players.length > 0)}
                  startIcon={<PlayArrowIcon />}
                  sx={{ flex: 4, fontWeight: 700 }}
                >
                  Start
                </Button>
                <Button
                  onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setStartMenuPos({ x: rect.left, y: rect.top }); }}
                  disabled={executing}
                  sx={{ flex: 1, minWidth: 0, px: 0 }}
                >
                  <ArrowDropDownIcon />
                </Button>
              </ButtonGroup>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/lobby')} sx={{ mb: 2 }}>
        Back to Lobbies
      </Button>


      <Box display="flex" gap={3}>
        {/* Sticky side panel — hidden when match is over */}
        {!matchOver && (
          <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
            {sidePanelContent}
          </Box>
        )}

        {/* Main content */}
        <Box flex={1} minWidth={0}>

      {/* Header */}
      <Card sx={{ mb: 3, ...(matchOver ? { opacity: 0.6 } : {}) }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Box display="flex" alignItems="center" gap={1}>
                {isCreator && lobby.status === 'waiting' ? (
                  <TextField
                    variant="standard"
                    value={lobby.state.lobbyName || ''}
                    placeholder={`${lobby.teamSize}v${lobby.teamSize} ${lobby.format.toUpperCase()}`}
                    onChange={(e) => handleUpdateConfig({ lobbyName: e.target.value })}
                    slotProps={{ input: { disableUnderline: true, sx: { fontFamily: '"Rajdhani", sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'text.primary', p: 0 } } }}
                    sx={{ minWidth: 200 }}
                  />
                ) : (
                  <Typography variant="h5" fontWeight={700} sx={{ fontFamily: '"Rajdhani", sans-serif' }}>
                    {lobby.state.lobbyName || `${lobby.teamSize}v${lobby.teamSize} ${lobby.format.toUpperCase()}`}
                  </Typography>
                )}
                <Chip label={lobby.gameMode.charAt(0).toUpperCase() + lobby.gameMode.slice(1)} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {lobby.teamSize}v{lobby.teamSize} · {lobby.state.players.length}/{maxPlayers} players · {lobby.mapPool.length} maps
              </Typography>
            </Box>
            {(() => {
              const label = lobby.matchStatus
                ? (lobby.matchStatus === 'live' ? 'LIVE' : lobby.matchStatus === 'loaded' ? 'Warmup' : lobby.matchStatus === 'completed' ? 'Finished' : lobby.matchStatus)
                : (STATUS_LABELS[lobby.status] || lobby.status);
              const dotColor = lobby.matchStatus === 'live' ? '#EE4B2B'
                : lobby.matchStatus === 'loaded' ? '#5B9BD5'
                : lobby.matchStatus === 'completed' ? '#666'
                : lobby.status === 'waiting' ? '#5FBF8F'
                : lobby.status === 'veto' ? '#FFC800'
                : lobby.status === 'picking' ? '#FF6309'
                : lobby.status === 'ready' ? '#5B9BD5'
                : '#8C95A3';
              const noAnimate = matchOver;
              return (
                <Box display="flex" alignItems="center" gap={0.75}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0,
                    animation: noAnimate ? 'none' : 'dotPulse 2s ease-in-out infinite',
                    '@keyframes dotPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                  }} />
                  <Typography variant="body2" fontWeight={600} sx={{ color: dotColor }}>{label}</Typography>
                </Box>
              );
            })()}
          </Box>
        </CardContent>
      </Card>

      {/* Picking phase banner */}
      {lobby.status === 'picking' && (
        <Alert severity={isMyPickTurn ? 'warning' : 'info'} sx={{ mb: 3, fontWeight: isMyPickTurn ? 700 : 400 }}>
          {isMyPickTurn
            ? 'Your turn to pick a player! Click on a player from the pool below.'
            : `Waiting for ${lobby.state.pickTurn === 'team1' ? 'Team 1' : 'Team 2'} captain to pick...`}
        </Alert>
      )}

      {/* Teams */}
      <Box display="flex" gap={3} mb={3} flexDirection={{ xs: 'column', md: 'row' }}>
        <TeamColumn team="team1" players={team1Players} color="#5B9BD5" />
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
        <Divider sx={{ display: { xs: 'block', md: 'none' } }} />
        <TeamColumn team="team2" players={team2Players} color="#FF6B57" />
      </Box>

      {/* Unassigned players pool */}
      {/* Spectators */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {lobby.status === 'picking' ? 'Available Players' : 'Spectators'}
            {unassigned.length > 0 && (
              <Chip label={unassigned.length} size="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
            )}
          </Typography>
          {unassigned.length > 0 ? (
            <Stack spacing={1}>{unassigned.map((p) => renderPlayer(p))}</Stack>
          ) : (
            <Typography variant="body2" color="text.disabled">No spectators</Typography>
          )}
          {lobby.status === 'waiting' && (
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
              {me && me.team !== 'unassigned' && !me.isCaptain && (
                <Button variant="outlined" onClick={() => handleJoinTeam('unassigned')} sx={{ height: 36 }}>
                  Move to Spectators
                </Button>
              )}
              {!me && (
                <Button variant="outlined" onClick={() => handleJoinTeam('unassigned')} sx={{ height: 36 }}>
                  Join as Spectator
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Map Veto */}
      {lobby.status === 'veto' && veto && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Map Veto</Typography>
            {!veto.completed && (
              <>
                {vetoCountdown !== null && (
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{
                        fontFamily: '"Rajdhani", sans-serif',
                        fontSize: '2rem',
                        color: vetoCountdown <= 10 ? '#EE4B2B' : vetoCountdown <= 20 ? '#FFC800' : 'text.primary',
                        animation: 'timerBeat 1s cubic-bezier(0.34, 1.56, 0.64, 1) infinite',
                        '@keyframes timerBeat': {
                          '0%': { transform: 'scale(1)', opacity: 1 },
                          '15%': { transform: vetoCountdown <= 10 ? 'scale(1.18)' : 'scale(1.06)' },
                          '30%': { transform: vetoCountdown <= 10 ? 'scale(0.95)' : 'scale(0.98)', opacity: 0.8 },
                          '45%': { transform: vetoCountdown <= 10 ? 'scale(1.05)' : 'scale(1.02)' },
                          '100%': { transform: 'scale(1)', opacity: 1 },
                        },
                        backgroundImage: vetoCountdown <= 10
                          ? 'linear-gradient(90deg, #EE4B2B, #FF6B57, #EE4B2B, #FF6B57)'
                          : 'none',
                        backgroundSize: '200% 100%',
                        backgroundClip: vetoCountdown <= 10 ? 'text' : undefined,
                        WebkitBackgroundClip: vetoCountdown <= 10 ? 'text' : undefined,
                        WebkitTextFillColor: vetoCountdown <= 10 ? 'transparent' : undefined,
                        ...(vetoCountdown <= 10 ? {
                          animationName: 'timerBeat, timerShimmer',
                          '@keyframes timerShimmer': {
                            '0%': { backgroundPosition: '200% 0' },
                            '100%': { backgroundPosition: '-200% 0' },
                          },
                          animationDuration: '1s, 2s',
                          animationTimingFunction: 'ease-in-out, linear',
                          animationIterationCount: 'infinite, infinite',
                        } : {}),
                      }}
                    >
                      {`0:${vetoCountdown.toString().padStart(2, '0')}`}
                    </Typography>
                  </Box>
                )}
                <Alert
                  severity={isMyVetoTurn ? 'warning' : 'info'}
                  sx={{ mb: 2, fontWeight: isMyVetoTurn ? 700 : 400 }}
                >
                  {isMyVetoTurn
                    ? `Your turn to ${veto.currentAction} a map!`
                    : `Waiting for ${veto.currentTurn === 'team1' ? getTeamName('team1') : getTeamName('team2')} to ${veto.currentAction}...`}
                </Alert>
              </>
            )}
            {veto.completed && (
              <Alert severity="success" sx={{ mb: 2 }}>Map veto complete! Selected: {veto.pickedMaps.map(getMapName).join(', ')}</Alert>
            )}
            {veto.actions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {veto.actions.map((a, i) => (
                    <Chip key={i} label={`${a.team === 'team1' ? 'T1' : 'T2'} ${a.action}: ${getMapName(a.map)}`} size="small" color={a.action === 'ban' ? 'error' : 'success'} variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}
            {!veto.completed && (
              <Box display="flex" flexWrap="wrap" gap={1.5}>
                {lobby.mapPool.map((mapId) => {
                  const isBanned = veto.bannedMaps.includes(mapId);
                  const isPicked = veto.pickedMaps.includes(mapId);
                  const isAvailable = veto.availableMaps.includes(mapId);
                  const canClick = isMyVetoTurn && isAvailable;
                  const mapData = allMaps.find((m) => m.id === mapId);
                  const imgUrl = mapData?.imageUrl || `https://raw.githubusercontent.com/sivert-io/cs2-server-manager/master/map_thumbnails/${mapId}.webp`;

                  return (
                    <Paper
                      key={mapId}
                      onClick={canClick ? () => handleVetoAction(mapId) : undefined}
                      sx={{
                        width: 160, overflow: 'hidden', position: 'relative',
                        cursor: canClick ? 'pointer' : 'default',
                        border: '2px solid',
                        borderColor: isPicked ? 'success.main' : isBanned ? 'error.dark' : canClick ? (veto.currentAction === 'ban' ? 'error.main' : 'success.main') : 'divider',
                        opacity: isBanned ? 0.45 : 1,
                        filter: isBanned ? 'grayscale(100%)' : 'none',
                        transition: 'all 0.15s',
                        '&:hover': canClick ? { transform: 'scale(1.03)', boxShadow: 3 } : {},
                      }}
                    >
                      <Box sx={{
                        height: 90,
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                      }}>
                        {isBanned && (
                          <Box sx={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(135deg, transparent 45%, rgba(255,80,80,0.8) 45%, rgba(255,80,80,0.8) 55%, transparent 55%)',
                          }} />
                        )}
                        {isPicked && (
                          <Box sx={{
                            position: 'absolute', inset: 0, bgcolor: 'rgba(95,191,143,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <CheckIcon sx={{ color: '#fff', fontSize: 36 }} />
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ px: 1, py: 0.75, textAlign: 'center' }}>
                        <Typography variant="caption" fontWeight={600} noWrap sx={{ textDecoration: isBanned ? 'line-through' : 'none' }}>
                          {getMapName(mapId)}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
            {veto.pickedMaps.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Selected Maps</Typography>
                <Stack direction="row" spacing={1}>
                  {veto.pickedMaps.map((m) => (<Chip key={m} label={getMapName(m)} color="success" />))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match Panel — shown when server is allocated */}
      {lobby.server && !matchOver && (
        <Box sx={{ mb: 3 }}>
          <LobbyMatchPanel
            matchSlug={lobby.matchSlug}
            team1Name={getTeamName('team1')}
            team2Name={getTeamName('team2')}
            team1Players={team1Players.map((p) => ({ steamId: p.steamId, name: p.name }))}
            team2Players={team2Players.map((p) => ({ steamId: p.steamId, name: p.name }))}
            maps={veto?.completed ? veto.pickedMaps : lobby.mapPool}
            server={lobby.server}
            getMapName={getMapName}
            getMapImage={(mapId) => {
              const m = allMaps.find((am) => am.id === mapId);
              return m?.imageUrl || `https://raw.githubusercontent.com/sivert-io/cs2-server-manager/master/map_thumbnails/${mapId}.webp`;
            }}
          />
        </Box>
      )}

      {/* Ready but no server yet */}
      {lobby.status === 'ready' && !lobby.server && !lobby.matchSlug && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {veto?.completed ? 'Maps Selected' : 'Ready to Start'}
            </Typography>
            {veto?.completed && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {veto.pickedMaps.map(getMapName).join(', ')}
              </Typography>
            )}
            {isCreator && (
              <Stack spacing={2} alignItems="center">
                <Box display="flex" gap={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 260 }}>
                    <InputLabel>Server</InputLabel>
                    <Select value={forceServerId} label="Server" onChange={(e) => setForceServerId(e.target.value)}>
                      <MenuItem value=""><em>Auto-select</em></MenuItem>
                      {servers.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name} ({s.host}:{s.port})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={() => act('create-match', forceServerId ? { serverId: forceServerId } : undefined)}
                    disabled={executing}
                    sx={{ px: 4, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {executing ? 'Creating...' : 'Start Match'}
                  </Button>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match created, waiting for server */}
      {lobby.matchSlug && !lobby.server && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Allocating Server...</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Match created. Waiting for a server to become available.
            </Typography>
            {isCreator && (
              <Box display="flex" gap={1} justifyContent="center" alignItems="center">
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Server</InputLabel>
                  <Select value={forceServerId} label="Server" onChange={(e) => setForceServerId(e.target.value)}>
                    <MenuItem value="" disabled><em>Select a server</em></MenuItem>
                    {servers.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name} ({s.host}:{s.port})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="warning"
                  disabled={executing || !forceServerId}
                  onClick={async () => {
                    setExecuting(true);
                    try {
                      await api.fetch(`/api/matches/${lobby.matchSlug}/allocate`, {
                        method: 'POST',
                        body: JSON.stringify({ serverId: forceServerId }),
                      });
                      await loadLobby();
                    } catch (err) {
                      let msg = err instanceof Error ? err.message : 'Failed to allocate';
                      try { const p = JSON.parse(msg); msg = p.error || p.message || msg; } catch { /* not JSON */ }
                      showError(msg);
                    } finally {
                      setExecuting(false);
                    }
                  }}
                >
                  Force Allocate
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile actions fallback */}
      {!matchOver && (
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
          {sidePanelContent}
        </Box>
      )}

      {/* Debug JSON output */}
      {debugJson && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" fontWeight={600}>Match Config JSON</Typography>
              <Box display="flex" gap={1}>
                <Button size="small" onClick={() => { navigator.clipboard.writeText(debugJson); showSuccess('Copied!'); }}>
                  Copy
                </Button>
                <Button size="small" color="error" onClick={() => setDebugJson(null)}>Close</Button>
              </Box>
            </Box>
            <Box
              component="pre"
              sx={{
                bgcolor: 'background.default',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 500,
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                border: '1px solid',
                borderColor: 'divider',
                m: 0,
              }}
            >
              {debugJson}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Match Configuration */}
      {lobby.status === 'waiting' && (
        <Card sx={{ ...(!isCreator ? { opacity: 0.6, pointerEvents: 'none' } : {}) }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Match Configuration {!isCreator && <Chip label="Host only" size="small" variant="outlined" sx={{ ml: 1, verticalAlign: 'middle' }} />}
            </Typography>
            <Stack spacing={3}>
              {/* Team Names */}
              <Box display="flex" gap={2} flexWrap="wrap">
                <TextField label="Team 1 Name" size="small" value={lobby.state.team1Name || ''} disabled={!isCreator}
                  placeholder={getTeamName('team1')}
                  onChange={(e) => handleUpdateConfig({ team1Name: e.target.value })} sx={{ flex: 1, minWidth: 120 }} />
                <TextField label="Team 2 Name" size="small" value={lobby.state.team2Name || ''} disabled={!isCreator}
                  placeholder={getTeamName('team2')}
                  onChange={(e) => handleUpdateConfig({ team2Name: e.target.value })} sx={{ flex: 1, minWidth: 120 }} />
              </Box>

              {/* Map Veto Toggle */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Map Veto</Typography>
                <ToggleButtonGroup
                  value={vetoEnabled ? 'on' : 'off'}
                  exclusive
                  onChange={(_e, val) => {
                    if (val === null) return;
                    setVetoEnabled(val === 'on');
                    if (val === 'off' && lobby.mapPool.length > 1) {
                      handleUpdateConfig({ mapPool: [lobby.mapPool[0]] });
                    }
                  }}
                  size="small"
                  disabled={!isCreator}
                >
                  <ToggleButton value="on" sx={{ px: 3 }}>On</ToggleButton>
                  <ToggleButton value="off" sx={{ px: 3 }}>Off</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Map Pool Presets (quick select) */}
              {vetoEnabled && mapPools.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Quick Select</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {mapPools.map((pool) => (
                      <Chip
                        key={pool.id}
                        label={`${pool.name} (${(pool.maps || []).length})`}
                        variant={JSON.stringify([...lobby.mapPool].sort()) === JSON.stringify([...(pool.maps || [])].sort()) ? 'filled' : 'outlined'}
                        color={JSON.stringify([...lobby.mapPool].sort()) === JSON.stringify([...(pool.maps || [])].sort()) ? 'primary' : 'default'}
                        onClick={isCreator ? () => handleUpdateConfig({ mapPool: pool.maps }) : undefined}
                        sx={{ cursor: isCreator ? 'pointer' : 'default' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Map Grid */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  {vetoEnabled ? `Map Pool (${lobby.mapPool.length} selected)` : 'Select Map'}
                </Typography>
                <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={1.5}>
                  {allMaps.map((map) => {
                    const isSelected = lobby.mapPool.includes(map.id);
                    const imgUrl = map.imageUrl?.includes('cs2-server-manager')
                      ? `https://raw.githubusercontent.com/sivert-io/cs2-server-manager/master/map_thumbnails/${map.id}.webp`
                      : map.imageUrl || `https://raw.githubusercontent.com/sivert-io/cs2-server-manager/master/map_thumbnails/${map.id}.webp`;

                    return (
                      <Card
                        key={map.id}
                        onClick={isCreator ? () => {
                          if (vetoEnabled) {
                            const newPool = isSelected
                              ? lobby.mapPool.filter((m) => m !== map.id)
                              : [...lobby.mapPool, map.id];
                            handleUpdateConfig({ mapPool: newPool });
                          } else {
                            handleUpdateConfig({ mapPool: [map.id] });
                          }
                        } : undefined}
                        sx={{
                          cursor: isCreator ? 'pointer' : 'default',
                          border: '2px solid',
                          borderColor: isSelected ? 'primary.main' : 'transparent',
                          opacity: isSelected ? 1 : 0.6,
                          transition: 'all 0.15s',
                          '&:hover': isCreator ? { opacity: 1, transform: 'translateY(-2px)', boxShadow: 3 } : {},
                        }}
                      >
                        <Box sx={{ height: 90, position: 'relative', overflow: 'hidden' }}>
                          {imgUrl ? (
                            <Box component="img" src={imgUrl} alt={map.displayName}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled' }}>
                              <MapIcon sx={{ fontSize: 36 }} />
                            </Box>
                          )}
                          {isSelected && (
                            <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
                              <CheckIcon sx={{ color: 'primary.main', fontSize: 20, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '50%', p: 0.25 }} />
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ px: 1, py: 0.75, textAlign: 'center' }}>
                          <Typography variant="caption" fontWeight={600} noWrap>{map.displayName}</Typography>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              </Box>

              {lobby.mapPool.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Selected: {lobby.mapPool.map(getMapName).join(', ')}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
        </Box>{/* end main content */}
      </Box>{/* end flex row */}

      {/* Start dropdown */}
      <Popover
        open={!!startMenuPos}
        onClose={() => setStartMenuPos(null)}
        anchorReference="anchorPosition"
        anchorPosition={startMenuPos ? { top: startMenuPos.y, left: startMenuPos.x } : undefined}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem onClick={() => { setStartMenuPos(null); handleStartVeto(); }}
          sx={{ color: 'warning.main' }}>
          <ListItemIcon><PlayArrowIcon fontSize="small" color="warning" /></ListItemIcon>
          <ListItemText>Force Start</ListItemText>
        </MenuItem>
      </Popover>

      {/* Player context menu */}
      <Popover
        open={!!playerMenu}
        onClose={() => setPlayerMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={playerMenu ? { top: playerMenu.y, left: playerMenu.x } : undefined}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem onClick={() => { if (playerMenu) handleSetCaptain(playerMenu.steamId, 'team1'); setPlayerMenu(null); }}>
          <ListItemIcon><StarIcon fontSize="small" sx={{ color: '#5B9BD5' }} /></ListItemIcon>
          <ListItemText>Captain Team 1</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (playerMenu) handleSetCaptain(playerMenu.steamId, 'team2'); setPlayerMenu(null); }}>
          <ListItemIcon><StarIcon fontSize="small" sx={{ color: '#FF6B57' }} /></ListItemIcon>
          <ListItemText>Captain Team 2</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { if (playerMenu) handleTransferOwnership(playerMenu.steamId); setPlayerMenu(null); }}>
          <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Transfer Host</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { if (playerMenu) handleKick(playerMenu.steamId); setPlayerMenu(null); }} sx={{ color: 'warning.main' }}>
          <ListItemIcon><PersonRemoveIcon fontSize="small" color="warning" /></ListItemIcon>
          <ListItemText>Kick</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (playerMenu) act('kick', { targetId: playerMenu.steamId }); setPlayerMenu(null); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><BlockIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Ban</ListItemText>
        </MenuItem>
      </Popover>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)}>
        <DialogTitle>{confirmAction?.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmAction?.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>No, go back</Button>
          <Button variant="contained" color="error" onClick={handleConfirmAction} disabled={executing}>
            {executing ? 'Processing...' : 'Yes, confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting for players',
  picking: 'Captain draft',
  veto: 'Map veto',
  ready: 'Ready',
  cancelled: 'Cancelled',
};

