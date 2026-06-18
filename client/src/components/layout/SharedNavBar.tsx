import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MenuIcon from '@mui/icons-material/Menu';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useCurrentMatchStatus } from '../../hooks/useCurrentMatchStatus';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useIsDevelopment } from '../../hooks/useIsDevelopment';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { generateAvatarDataUrl } from '../../generation/avatar';
import { api } from '../../utils/api';

const PLAYER_AVATAR_CACHE_KEY_PREFIX = 'mat.playerAvatarUrl:';

function readCachedPlayerAvatarUrl(steamId: string): string | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    const raw = window.localStorage.getItem(`${PLAYER_AVATAR_CACHE_KEY_PREFIX}${steamId}`);
    if (typeof raw !== 'string') return undefined;
    const value = raw.trim();
    if (value === '') return undefined;
    // Only accept http(s) URLs as cached avatars.
    if (!value.startsWith('http')) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

interface SharedNavBarProps {
  /**
   * Optional sidebar menu button for admin layouts.
   * When rendered in public layouts, this is typically omitted.
   */
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

export const SharedNavBar: React.FC<SharedNavBarProps> = ({
  showMenuButton,
  onMenuClick,
}) => {
  const {
    playerSteamId,
    isAuthenticated,
    needsSteamLink,
    loginWithSteam,
    logout,
    adminProfileName,
    adminProfileAvatarUrl,
    viewAsUser,
    setViewAsUser,
    isRealAdmin,
  } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status: matchStatus, label: matchStatusLabel, loading: matchStatusLoading } =
    useCurrentMatchStatus(playerSteamId ?? null);
  const { showSnackbar } = useSnackbar();

  const isDev = useIsDevelopment();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const prevMatchRef = React.useRef<{ status: string; label: string | null } | null>(null);
  const [playerAvatarUrl, setPlayerAvatarUrl] = React.useState<string | undefined>(undefined);
  const [playerName, setPlayerName] = React.useState<string>('Player');
  const [isLoadingPlayer, setIsLoadingPlayer] = React.useState(false);
  const [activeLobby, setActiveLobby] = React.useState<{ id: string; status: string; matchStatus?: string } | null>(null);

  const handleAvatarMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAvatarMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    void logout();
    navigate('/login');
  };

  React.useEffect(() => {
    if (!playerSteamId) {
      setPlayerAvatarUrl(undefined);
      setIsLoadingPlayer(false);
      return;
    }

    let isMounted = true;
    const cachedAvatarUrl = readCachedPlayerAvatarUrl(playerSteamId);
    if (cachedAvatarUrl) {
      setPlayerAvatarUrl(cachedAvatarUrl);
    }
    setIsLoadingPlayer(true);

    const loadPlayerSummary = async () => {
      try {
        const response = await api.get<{
          success: boolean;
          player?: { name: string; avatar?: string | null };
        }>(`/api/players/${playerSteamId}/summary`);

        if (!isMounted) return;

        if (response.success && response.player) {
          setPlayerName(response.player.name);
          const avatarCandidate = response.player.avatar ?? undefined;
          if (typeof avatarCandidate === 'string' && avatarCandidate.trim() !== '') {
            setPlayerAvatarUrl(avatarCandidate);
          } else if (cachedAvatarUrl) {
            setPlayerAvatarUrl(cachedAvatarUrl);
          } else {
            setPlayerAvatarUrl(undefined);
          }
        }
      } catch {
        // Best-effort only; fall back to deterministic SVG avatar.
        if (isMounted) {
          setPlayerAvatarUrl(cachedAvatarUrl);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlayer(false);
        }
      }
    };

    void loadPlayerSummary();

    return () => {
      isMounted = false;
    };
  }, [playerSteamId]);

  React.useEffect(() => {
    if (!playerSteamId) {
      prevMatchRef.current = null;
      return;
    }
    if (matchStatusLoading) return;
    const prev = prevMatchRef.current;
    const now = { status: matchStatus, label: matchStatusLabel };
    if (prev && (prev.status !== now.status || prev.label !== now.label)) {
      const msg =
        now.label === 'your_turn_veto'
          ? t('nav.matchStatus.yourTurnVeto')
          : now.label === 'waiting_veto' && prev.label === 'your_turn_veto'
            ? t('nav.matchStatus.snackbarOpponentMoved')
            : now.label === 'waiting_veto'
              ? t('nav.matchStatus.waitingVeto')
              : now.label === 'match_ready'
                ? t('nav.matchStatus.matchReady')
                : now.label === 'waiting_server'
                  ? t('nav.matchStatus.waitingServer')
                  : null;
      if (msg) {
        showSnackbar(msg, now.label === 'match_ready' ? 'success' : 'info');
      }
    }
    prevMatchRef.current = now;
  }, [playerSteamId, matchStatusLoading, matchStatus, matchStatusLabel, showSnackbar, t]);

  // Poll for active lobby status
  React.useEffect(() => {
    if (!playerSteamId) { setActiveLobby(null); return; }
    let mounted = true;
    const poll = async () => {
      try {
        const res = await api.fetch('/api/lobbies/my-lobby');
        if (mounted && res.lobby) {
          setActiveLobby({ id: res.lobby.id, status: res.lobby.status, matchStatus: res.lobby.matchStatus });
        } else if (mounted) {
          setActiveLobby(null);
        }
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [playerSteamId]);

  void matchStatus; void matchStatusLabel; // kept for snackbar notifications above

  return (
    <>
      {showMenuButton && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          minWidth: 0,
        }}
      >
        <Box
          component={RouterLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          <Box
            component="img"
            src="/faviconv2.png"
            alt="CS-FULM SCRIM"
            sx={{ height: 32 }}
          />
          <Typography
            sx={{
              fontFamily: '"High Speed", sans-serif',
              fontSize: '1.3rem',
              fontWeight: 400,
              letterSpacing: '0.08em',
              color: 'primary.main',
              ml: 1,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            CS-FULM
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <Button color="inherit" component={RouterLink} to="/player" size="small">
            {t('nav.players')}
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/tournament/1/leaderboard"
            size="small"
          >
            {t('nav.leaderboard')}
          </Button>
          <Button
            color="primary"
            component={RouterLink}
            to="/lobby"
            size="small"
            startIcon={<SportsEsportsIcon />}
            sx={{ fontWeight: 600 }}
          >
            Lobby
          </Button>
          <Button
            color="primary"
            component={RouterLink}
            to="/inventory"
            size="small"
            startIcon={<Inventory2Icon />}
            sx={{ fontWeight: 600 }}
          >
            Inventory
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
          {activeLobby ? (
            <Button
              component={RouterLink}
              to={`/lobby/${activeLobby.id}`}
              size="small"
              startIcon={<ArrowBackIcon />}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                px: 2,
                color: 'primary.main',
                borderRadius: 1,
                animation: 'lobbyPulse 2s ease-in-out infinite',
                '@keyframes lobbyPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.6 },
                },
              }}
            >
              Return to Lobby
            </Button>
          ) : null}
        </Box>
        {import.meta.env.DEV && isRealAdmin && !viewAsUser && (
          <Tooltip title="View site as a regular player (non-admin)">
            <Chip
              icon={<VisibilityIcon sx={{ fontSize: 16 }} />}
              label="View as User"
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => setViewAsUser(true)}
              sx={{ cursor: 'pointer' }}
            />
          </Tooltip>
        )}
        {import.meta.env.DEV && viewAsUser && (
          <Chip
            icon={<VisibilityIcon sx={{ fontSize: 16 }} />}
            label="Viewing as User"
            size="small"
            color="warning"
            onClick={() => setViewAsUser(false)}
            onDelete={() => setViewAsUser(false)}
            sx={{ cursor: 'pointer', fontWeight: 700 }}
          />
        )}
        <LanguageSwitcher />

        {needsSteamLink && (
          <Button
            color="warning"
            variant="outlined"
            onClick={loginWithSteam}
            size="small"
          >
            {t('nav.linkSteam')}
          </Button>
        )}

        {playerSteamId || isAuthenticated ? (
          <>
            <IconButton
              onClick={handleAvatarMenuOpen}
              size="small"
              sx={{ ml: 1 }}
              data-testid="nav-avatar-button"
            >
              {playerSteamId ? (
                <PlayerAvatar
                  id={playerSteamId}
                  name={playerName}
                  avatarUrl={playerAvatarUrl}
                  size={32}
                  isLoading={isLoadingPlayer}
                />
              ) : (
                <Avatar
                  src={
                    adminProfileAvatarUrl ||
                    generateAvatarDataUrl(`admin:${adminProfileName || 'Admin'}`)
                  }
                  alt={adminProfileName || 'Admin'}
                  sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
                />
              )}
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleAvatarMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {isAuthenticated && (
                <MenuItem
                  onClick={() => {
                    handleAvatarMenuClose();
                    navigate('/');
                  }}
                >
                  {t('nav.dashboard')}
                </MenuItem>
              )}
              {playerSteamId && (
                <MenuItem
                  onClick={() => {
                    handleAvatarMenuClose();
                    navigate(`/player/${playerSteamId}`);
                  }}
                >
                  {t('nav.myProfile')}
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  handleAvatarMenuClose();
                  handleLogout();
                }}
                data-testid="sign-out-button"
              >
                {t('nav.signOut')}
              </MenuItem>
            </Menu>
          </>
        ) : null}
      </Box>
    </>
  );
};

