import * as React from 'react';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import ListSubheader from '@mui/material/ListSubheader';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CampaignIcon from '@mui/icons-material/Campaign';
import SettingsIcon from '@mui/icons-material/Settings';
import BuildIcon from '@mui/icons-material/Build';
import MapIcon from '@mui/icons-material/Map';
import DescriptionIcon from '@mui/icons-material/Description';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { api } from '../../utils/api';
import { PortalId, portalPaths } from '../../config/portals';
import { pageWidth } from '../../shared/ui/layoutTokens';
import type { SettingsResponse } from '../../types/api.types';
import { useIsDevelopment } from '../../hooks/useIsDevelopment';
import { useTranslation } from 'react-i18next';
import { SharedNavBar } from './SharedNavBar';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  variants: [
    {
      props: ({ open }) => open,
      style: {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
      },
    },
    {
      props: ({ open }) => !open,
      style: {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
      },
    },
  ],
}));

interface LayoutProps {
  portal: PortalId;
}

export default function Layout({ portal }: LayoutProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { headerActions } = usePageHeader();
  const { showError, showPersistentError, closeSnackbar } = useSnackbar();
  const hasShownWebhookWarningRef = React.useRef(false);
  const [dbHealthSnackbarKey, setDbHealthSnackbarKey] = React.useState<import('notistack').SnackbarKey | null>(null);
  const [steamHealthSnackbarKey, setSteamHealthSnackbarKey] = React.useState<import('notistack').SnackbarKey | null>(
    null
  );
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const contentContainerRef = React.useRef<HTMLDivElement>(null);
  const [webhookConfigured, setWebhookConfigured] = React.useState<boolean | null>(null);
  const [open, setOpen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage first, then fall back to screen size
      const stored = localStorage.getItem('sidebarOpen');
      if (stored !== null) {
        return stored === 'true';
      }
      return window.innerWidth >= theme.breakpoints.values.md;
    }
    return false;
  });

  const isDevelopment = useIsDevelopment();
  const { playerSteamId } = useAuth();
  const isOrganizerPortal = portal === 'organizer';
  const homePath = isOrganizerPortal ? portalPaths.organizer.home : portalPaths.player.home;
  const homeLabel = isOrganizerPortal ? t('nav.dashboard') : 'Início';

  // Page header configuration - maps routes to their titles and icons
  const pageHeaders: Record<string, { title: string; icon: React.ComponentType; color?: string }> =
    {
      [portalPaths.player.home]: { title: 'Player Hub', icon: HomeIcon },
      [portalPaths.player.lobbies]: { title: 'Lobbies', icon: SportsEsportsIcon },
      [portalPaths.player.inventory]: { title: 'Skins', icon: SportsEsportsIcon },
      [portalPaths.organizer.home]: { title: t('layout.pageTitle.dashboard'), icon: DashboardIcon },
      [portalPaths.organizer.tournament]: { title: t('layout.pageTitle.tournament'), icon: EmojiEventsIcon },
      [portalPaths.organizer.bracket]: { title: t('layout.pageTitle.bracket'), icon: AccountTreeIcon },
      [portalPaths.organizer.matches]: { title: t('layout.pageTitle.matches'), icon: SportsEsportsIcon },
      [portalPaths.organizer.teams]: { title: t('layout.pageTitle.teams'), icon: GroupsIcon },
      [portalPaths.organizer.players]: { title: t('layout.pageTitle.players'), icon: PersonIcon },
      [portalPaths.organizer.servers]: { title: t('layout.pageTitle.servers'), icon: StorageIcon },
      [portalPaths.organizer.maps]: { title: t('layout.pageTitle.maps'), icon: MapIcon },
      [portalPaths.organizer.templates]: { title: t('layout.pageTitle.templates'), icon: DescriptionIcon },
      [portalPaths.organizer.eloTemplates]: { title: t('layout.pageTitle.eloTemplates'), icon: TrendingUpIcon },
      [portalPaths.organizer.admin]: { title: t('layout.pageTitle.adminTools'), icon: CampaignIcon },
      [portalPaths.organizer.settings]: { title: t('layout.pageTitle.settings'), icon: SettingsIcon },
      [portalPaths.organizer.development]: {
        title: t('layout.pageTitle.devTools'),
        icon: BugReportIcon,
        color: 'warning.main',
      },
    };

  // Get current page header config
  const currentPageHeader = pageHeaders[location.pathname];

  // Group navigation items logically
  const mainNavItems = isOrganizerPortal
    ? [
        { label: t('nav.tournament'), path: portalPaths.organizer.tournament, icon: EmojiEventsIcon },
        { label: t('nav.bracket'), path: portalPaths.organizer.bracket, icon: AccountTreeIcon },
        { label: t('nav.matches'), path: portalPaths.organizer.matches, icon: SportsEsportsIcon },
      ]
    : [
        { label: 'Lobbies', path: portalPaths.player.lobbies, icon: SportsEsportsIcon },
        { label: 'Skins', path: portalPaths.player.inventory, icon: SportsEsportsIcon },
        ...(playerSteamId
          ? [{ label: 'Meu perfil', path: `/player/${playerSteamId}`, icon: PersonIcon }]
          : []),
      ];

  const resourcesNavItems = isOrganizerPortal
    ? [
        { label: t('nav.teams'), path: portalPaths.organizer.teams, icon: GroupsIcon },
        { label: t('nav.players'), path: portalPaths.organizer.players, icon: PersonIcon },
        { label: t('nav.servers'), path: portalPaths.organizer.servers, icon: StorageIcon },
        { label: t('nav.maps'), path: portalPaths.organizer.maps, icon: MapIcon },
      ]
    : [{ label: 'Buscar jogadores', path: portalPaths.player.players, icon: PersonIcon }];

  const configurationNavItems = isOrganizerPortal
    ? [
        { label: t('nav.templates'), path: portalPaths.organizer.templates, icon: DescriptionIcon },
        { label: t('nav.eloTemplates'), path: portalPaths.organizer.eloTemplates, icon: TrendingUpIcon },
        { label: t('nav.settings'), path: portalPaths.organizer.settings, icon: SettingsIcon },
      ]
    : [];

  const systemNavItems = isOrganizerPortal
    ? [
        { label: t('nav.adminTools'), path: portalPaths.organizer.admin, icon: CampaignIcon },
        ...(isDevelopment
          ? [{ label: t('nav.devTools'), path: portalPaths.organizer.development, icon: BuildIcon }]
          : []),
      ]
    : [];

  React.useEffect(() => {
    if (!isOrganizerPortal) {
      setWebhookConfigured(null);
      return;
    }
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const response = await api.get<SettingsResponse>('/api/settings');
        if (isMounted) {
          setWebhookConfigured(Boolean(response.settings?.webhookConfigured));
        }
      } catch {
        if (isMounted) {
          setWebhookConfigured(false);
        }
      }
    };

    loadSettings();

    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<SettingsResponse['settings']>;
      setWebhookConfigured(Boolean(customEvent.detail?.webhookConfigured));
    };

    window.addEventListener('matchzy:settingsUpdated', handleSettingsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('matchzy:settingsUpdated', handleSettingsUpdated);
    };
  }, [isOrganizerPortal]);

  // Global admin warning: keep a persistent snackbar while any server reports plugin DB down.
  React.useEffect(() => {
    if (!isOrganizerPortal) return;
    let cancelled = false;

    const checkDbHealth = async () => {
      try {
        const response = await api.get<{ success: boolean; servers?: Array<{ enabled?: boolean; matchzyDbOk?: boolean | null }> }>(
          '/api/servers'
        );
        if (cancelled) return;
        const servers = response.servers ?? [];
        const downCount = servers.filter((s) => s.enabled !== false && s.matchzyDbOk === false).length;

        if (downCount > 0) {
          if (!dbHealthSnackbarKey) {
            const key = showPersistentError(
              <span>
                <strong>MatchZy DB unreachable</strong> — {downCount}{' '}
                {downCount === 1 ? 'server has' : 'servers have'} reported that the plugin cannot reach its database.
                Backups/event queue may be impacted.
              </span>,
              'matchzy-db-down'
            );
            setDbHealthSnackbarKey(key);
          }
        } else if (dbHealthSnackbarKey) {
          closeSnackbar(dbHealthSnackbarKey);
          setDbHealthSnackbarKey(null);
        }
      } catch {
        // Non-fatal; we don't want global UI to hard-fail.
      }
    };

    void checkDbHealth();
    const interval = window.setInterval(checkDbHealth, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [dbHealthSnackbarKey, showPersistentError, closeSnackbar, isOrganizerPortal]);

  // Global admin warning: keep a persistent snackbar while Steam integration is unhealthy.
  React.useEffect(() => {
    if (!isOrganizerPortal) return;
    let cancelled = false;

    const checkSteamHealth = async () => {
      try {
        const response = await api.get<{
          success?: boolean;
          configured?: boolean;
          valid?: boolean;
          errorType?: string;
          error?: string;
        }>('/api/steam/status');

        if (cancelled) return;

        const configured = response.configured;
        const valid = response.valid;
        const isUnhealthy =
          configured === false || valid === false || response.success === false;

        if (isUnhealthy) {
          if (!steamHealthSnackbarKey) {
            const key = showPersistentError(
              <span>
                <strong>Steam integration unavailable</strong> — Sign-ins and vanity URL lookups may not work. Check server configuration and connectivity.
              </span>,
              'steam-api-health'
            );
            setSteamHealthSnackbarKey(key);
          }
        } else if (steamHealthSnackbarKey) {
          closeSnackbar(steamHealthSnackbarKey);
          setSteamHealthSnackbarKey(null);
        }
      } catch {
        // Non-fatal. This endpoint is admin-authenticated and can fail during login bootstrap.
      }
    };

    void checkSteamHealth();
    const interval = window.setInterval(checkSteamHealth, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [steamHealthSnackbarKey, showPersistentError, closeSnackbar, isOrganizerPortal]);

  // Show a single global snackbar when webhook is not configured
  const handleOpenSettingsFromSnackbar = React.useCallback(() => {
    navigate(portalPaths.organizer.settings);
  }, [navigate]);

  React.useEffect(() => {
    if (!isOrganizerPortal) return;
    if (webhookConfigured === false && !hasShownWebhookWarningRef.current) {
      hasShownWebhookWarningRef.current = true;
      showError(
        <Box display="flex" alignItems="center" gap={1}>
          <Box component="span" sx={{ mr: 1 }}>
            {t('layout.webhookNotConfigured')}
          </Box>
          <Button
            color="inherit"
            size="small"
            onClick={handleOpenSettingsFromSnackbar}
            sx={{ textDecoration: 'underline' }}
          >
            {t('layout.openSettings')}
          </Button>
        </Box>
      );
    }

    if (webhookConfigured === true) {
      hasShownWebhookWarningRef.current = false;
    }
  }, [webhookConfigured, showError, handleOpenSettingsFromSnackbar, t, isOrganizerPortal]);

  // Fallback page title handling for critical routes (e.g. Matches)
  React.useEffect(() => {
    // Let individual pages manage their own titles where possible, but ensure that
    // the Matches page always exposes a stable, human‑readable title for tests.
    if (location.pathname.startsWith(portalPaths.organizer.matches)) {
      document.title = `Fragbase: ${t('layout.pageTitle.matches')}`;
    }
  }, [location.pathname, t]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname === path + '/';
  };

  // Persist sidebar state to localStorage
  React.useEffect(() => {
    // Only persist on desktop (md and up), not mobile
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', open.toString());
    }
  }, [open, isMobile]);

  // Scroll to top when route changes
  React.useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [location.pathname]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  const renderNavItems = (items: typeof mainNavItems) => {
    return items.map((item) => {
      const Icon = item.icon;
      return (
        <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
          <Tooltip title={!open ? item.label : ''} placement="right">
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleNavClick(item.path)}
              component={Link}
              to={item.path}
              sx={[
                {
                  minHeight: 48,
                  px: 2.5,
                },
                open
                  ? {
                      justifyContent: 'initial',
                    }
                  : {
                      justifyContent: 'center',
                    },
                {
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                },
              ]}
            >
              <ListItemIcon
                sx={[
                  {
                    minWidth: 0,
                    justifyContent: 'center',
                    color: isActive(item.path)
                      ? open
                        ? 'primary.contrastText'
                        : 'primary.main'
                      : 'inherit',
                  },
                  open
                    ? {
                        mr: 3,
                      }
                    : {
                        mr: 'auto',
                      },
                ]}
              >
                <Icon />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={[
                  open
                    ? {
                        opacity: 1,
                      }
                    : {
                        opacity: 0,
                      },
                ]}
              />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      );
    });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      {/* Mobile Drawer (temporary) */}
      <MuiDrawer
        variant="temporary"
        open={open}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <DrawerHeader>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              px: 2,
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="img" src="/fragbase-logo.png" alt="Fragbase" sx={{ width: 32, height: 32, borderRadius: 999 }} />
              <Typography variant="body2" noWrap component="div" sx={{ fontWeight: 600 }}>
                Fragbase
              </Typography>
            </Box>
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Box>
        </DrawerHeader>
        <Divider />
        <List>
          <Tooltip title={!open ? homeLabel : ''} placement="right">
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                selected={location.pathname === homePath}
                onClick={() => handleNavClick(homePath)}
                component={Link}
                to={homePath}
                sx={[
                  {
                    minHeight: 48,
                    px: 2.5,
                    justifyContent: 'initial',
                  },
                  {
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  },
                ]}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: 'center',
                    mr: 3,
                    color: location.pathname === homePath ? 'primary.contrastText' : 'inherit',
                  }}
                >
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText primary={homeLabel} />
              </ListItemButton>
            </ListItem>
          </Tooltip>
        </List>
        <Divider />
        <List>
          <ListSubheader
            sx={{
              fontSize: 12,
              fontWeight: 600,
              height: 36,
              px: 2.5,
              py: 0,
              lineHeight: '36px',
            }}
          >
            {t('nav.tournamentSection')}
          </ListSubheader>
          {renderNavItems(mainNavItems)}
        </List>
        {resourcesNavItems.length > 0 && (
          <>
            <Divider />
            <List>
              <ListSubheader
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  height: 36,
                  px: 2.5,
                  py: 0,
                  lineHeight: '36px',
                }}
              >
                {t('nav.resourcesSection')}
              </ListSubheader>
              {renderNavItems(resourcesNavItems)}
            </List>
          </>
        )}
        {configurationNavItems.length > 0 && (
          <>
            <Divider />
            <List>
              <ListSubheader
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  height: 36,
                  px: 2.5,
                  py: 0,
                  lineHeight: '36px',
                }}
              >
                {t('nav.configurationSection')}
              </ListSubheader>
              {renderNavItems(configurationNavItems)}
            </List>
          </>
        )}
        {systemNavItems.length > 0 && (
          <>
            <Divider />
            <List>
              <ListSubheader
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  height: 36,
                  px: 2.5,
                  py: 0,
                  lineHeight: '36px',
                }}
              >
                {t('nav.systemSection')}
              </ListSubheader>
              {renderNavItems(systemNavItems)}
            </List>
          </>
        )}
      </MuiDrawer>

      {/* Desktop Drawer (permanent mini variant) */}
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          <Tooltip title={!open ? homeLabel : ''} placement="right">
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                selected={location.pathname === homePath}
                onClick={() => handleNavClick(homePath)}
                component={Link}
                to={homePath}
                sx={[
                  {
                    minHeight: 48,
                    px: 2.5,
                  },
                  open
                    ? {
                        justifyContent: 'initial',
                      }
                    : {
                        justifyContent: 'center',
                      },
                  {
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                    },
                  },
                ]}
              >
                <ListItemIcon
                  sx={[
                    {
                      minWidth: 0,
                      justifyContent: 'center',
                      color:
                        location.pathname === homePath
                          ? open
                            ? 'primary.contrastText'
                            : 'primary.main'
                          : 'inherit',
                    },
                    open
                      ? {
                          mr: 3,
                        }
                      : {
                          mr: 'auto',
                        },
                  ]}
                >
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText
                  primary={homeLabel}
                  sx={[
                    open
                      ? {
                          opacity: 1,
                        }
                      : {
                          opacity: 0,
                        },
                  ]}
                />
              </ListItemButton>
            </ListItem>
          </Tooltip>
        </List>
        <Divider />
        <List>
          {open && (
            <ListSubheader
              sx={{
                fontSize: 12,
                fontWeight: 600,
                height: 36,
                px: 2.5,
                py: 0,
                lineHeight: '36px',
              }}
            >
              {t('nav.tournamentSection')}
            </ListSubheader>
          )}
          {renderNavItems(mainNavItems)}
        </List>
        {resourcesNavItems.length > 0 && (
          <>
            <Divider />
            <List>
              {open && (
                <ListSubheader
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    height: 36,
                    px: 2.5,
                    py: 0,
                    lineHeight: '36px',
                  }}
                >
                  {t('nav.resourcesSection')}
                </ListSubheader>
              )}
              {renderNavItems(resourcesNavItems)}
            </List>
          </>
        )}
        {configurationNavItems.length > 0 && (
          <>
            <Divider />
            <List>
              {open && (
                <ListSubheader
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    height: 36,
                    px: 2.5,
                    py: 0,
                    lineHeight: '36px',
                  }}
                >
                  {t('nav.configurationSection')}
                </ListSubheader>
              )}
              {renderNavItems(configurationNavItems)}
            </List>
          </>
        )}
        {systemNavItems.length > 0 && (
          <>
            <Divider />
            <List>
              {open && (
                <ListSubheader
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    height: 36,
                    px: 2.5,
                    py: 0,
                    lineHeight: '36px',
                  }}
                >
                  {t('nav.systemSection')}
                </ListSubheader>
              )}
              {renderNavItems(systemNavItems)}
            </List>
          </>
        )}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <AppBar position="fixed" open={open} color="inherit" sx={{ displayPrint: 'none' }}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={[
                {
                  marginRight: 2,
                },
                open && { display: { xs: 'block', md: 'none' } },
              ]}
            >
              <MenuIcon />
            </IconButton>
            <SharedNavBar portal={portal} />
          </Toolbar>
        </AppBar>
        <DrawerHeader />
        <Box
          ref={contentContainerRef}
          sx={{
            width: '100%',
            flexGrow: 1,
            overflow: 'auto',
            p: 3,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: pageWidth.full, mx: 'auto' }}>
            {/* Page Header */}
            {currentPageHeader && (
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box
                    component={currentPageHeader.icon}
                    sx={{
                      fontSize: 28,
                      color: currentPageHeader.color || 'primary.main',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="h5" fontWeight={700}>
                    {currentPageHeader.title}
                  </Typography>
                </Box>
                {headerActions && <Box>{headerActions}</Box>}
              </Box>
            )}
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
