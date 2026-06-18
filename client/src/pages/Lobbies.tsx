import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { Lobby } from '../types/lobby.types';
import io from 'socket.io-client';

const CHIP_SX = { height: 24, fontSize: '0.75rem', fontWeight: 600 };

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Open',
  picking: 'Drafting',
  veto: 'Map Veto',
  ready: 'Ready',
  cancelled: 'Cancelled',
};

const MATCH_STATUS_LABEL: Record<string, string> = {
  loaded: 'Warmup',
  live: 'LIVE',
  completed: 'Finished',
  cancelled: 'Cancelled',
};


export default function Lobbies() {
  const navigate = useNavigate();
  const { playerSteamId, isRealAdmin } = useAuth();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const { showError } = useSnackbar();
  const [creating, setCreating] = useState(false);

  const parseError = (err: unknown, fallback: string) => {
    let msg = err instanceof Error ? err.message : fallback;
    try { const p = JSON.parse(msg); msg = p.error || p.message || msg; } catch { /* not JSON */ }
    return msg;
  };
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; lobbyId: string } | null>(null);
  const navigatingRef = React.useRef(false);

  useEffect(() => { document.title = 'FULM: Lobby'; }, []);

  const loadLobbies = useCallback(async () => {
    if (navigatingRef.current) return;
    try {
      const res = await api.fetch('/api/lobbies');
      if (!navigatingRef.current) setLobbies(res.lobbies || []);
    } catch {
      if (!navigatingRef.current) showError('Failed to load lobbies');
    }
  }, [showError]);

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    const refresh = () => { if (!navigatingRef.current) loadLobbies(); };
    refresh();
    socket.on('lobby:created', refresh);
    socket.on('lobby:update', refresh);
    socket.on('lobby:deleted', refresh);
    return () => { socket.disconnect(); };
  }, [loadLobbies]);

  const handleCreate = async () => {
    setCreating(true);
    navigatingRef.current = true;
    try {
      const res = await api.fetch('/api/lobbies', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res.lobby?.id) {
        window.location.href = `/lobby/${res.lobby.id}`;
        return;
      }
      navigatingRef.current = false;
    } catch (err) {
      navigatingRef.current = false;
      showError(parseError(err, 'Failed to create lobby'));
      setCreating(false);
    }
  };

  const handleJoin = async (lobbyId: string) => {
    try {
      const lobby = lobbies.find((l) => l.id === lobbyId);
      const isInLobby = lobby?.state.players.some((p) => p.steamId === playerSteamId);
      if (!isInLobby) {
        await api.fetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
      }
      navigate(`/lobby/${lobbyId}`);
    } catch (err) {
      showError(parseError(err, 'Failed to join'));
    }
  };

  const handleDeleteLobby = async (lobbyId: string) => {
    setMenuAnchor(null);
    try {
      await api.fetch(`/api/lobbies/${lobbyId}`, { method: 'DELETE' });
      loadLobbies();
    } catch (err) {
      showError(parseError(err, 'Failed to delete lobby'));
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <SportsEsportsIcon sx={{ fontSize: 28, color: 'primary.main', flexShrink: 0 }} />
          <Typography variant="h5" fontWeight={700}>
            Lobby
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating...' : 'Create Match'}
        </Button>
      </Box>


      {lobbies.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <SportsEsportsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No active lobbies
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create a match to get started. Friends can join from this page.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={creating}>
              Create Match
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {lobbies.map((lobby) => {
            const playerCount = lobby.state.players.length;
            const maxPlayers = lobby.teamSize * 2;
            const isInLobby = lobby.state.players.some((p) => p.steamId === playerSteamId);
            const isFinished = lobby.matchStatus === 'completed' || lobby.matchStatus === 'cancelled';
            const statusLabel = lobby.matchStatus ? MATCH_STATUS_LABEL[lobby.matchStatus] : STATUS_LABELS[lobby.status];
            const statusDotColor = lobby.matchStatus === 'live' ? '#EE4B2B'
              : lobby.matchStatus === 'loaded' ? '#5B9BD5'
              : lobby.matchStatus === 'completed' ? '#666'
              : lobby.status === 'waiting' ? '#5FBF8F'
              : lobby.status === 'veto' ? '#FFC800'
              : lobby.status === 'picking' ? '#FF6309'
              : lobby.status === 'ready' ? '#5B9BD5'
              : '#8C95A3';

            return (
              <Card
                key={lobby.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '2px solid',
                  borderColor: isInLobby ? 'primary.main' : 'transparent',
                  opacity: isFinished ? 0.45 : 1,
                  bgcolor: isFinished ? 'action.disabledBackground' : 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: 6,
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => handleJoin(lobby.id)}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                      <GroupsIcon sx={{ color: isFinished ? 'text.disabled' : 'primary.main', fontSize: 28 }} />
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" fontWeight={600} sx={{ fontFamily: '"Rajdhani", sans-serif' }}>
                            {lobby.state.lobbyName || `${lobby.teamSize}v${lobby.teamSize} ${lobby.format.toUpperCase()}`}
                          </Typography>
                          <Chip label={lobby.gameMode.charAt(0).toUpperCase() + lobby.gameMode.slice(1)} size="small" variant="outlined" sx={CHIP_SX} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {lobby.teamSize}v{lobby.teamSize} · Created by {lobby.state.players.find((p) => p.steamId === lobby.createdBy)?.name || 'Unknown'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={2}>
                      <Box display="flex" alignItems="center" gap={0.75} sx={{ minWidth: 90 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: statusDotColor,
                            flexShrink: 0,
                            animation: isFinished ? 'none' : 'dotPulse 2s ease-in-out infinite',
                            '@keyframes dotPulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.3 },
                            },
                          }}
                        />
                        <Typography variant="body2" fontWeight={600} sx={{ color: statusDotColor }}>
                          {statusLabel || lobby.status}
                        </Typography>
                      </Box>
                      <AvatarGroup max={6} sx={{ '& .MuiAvatar-root': { width: 30, height: 30, fontSize: 13, border: '2px solid', borderColor: 'background.paper' } }}>
                        {lobby.state.players.map((p) => (
                          <Avatar key={p.steamId} src={p.avatar} alt={p.name} sx={{ width: 30, height: 30 }}>
                            {p.name[0]}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                      <Chip label={`${playerCount}/${maxPlayers}`} variant="outlined" sx={CHIP_SX} />
                      {isRealAdmin && (
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setMenuAnchor({ el: e.currentTarget, lobbyId: lobby.id }); }}
                          sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Admin context menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => menuAnchor && handleDeleteLobby(menuAnchor.lobbyId)} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete Lobby
        </MenuItem>
      </Menu>
    </Box>
  );
}
