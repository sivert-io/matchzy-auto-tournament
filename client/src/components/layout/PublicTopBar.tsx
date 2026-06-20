import { AppBar, Box, Button, Chip, Link, Stack, Toolbar, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { PortalId } from '../../config/portals';
import { getPortalHome, isPublicNavActive, playerPublicNav } from '../../config/publicNav';

interface PublicTopBarProps {
  portal?: PortalId;
  /** Show the primary sign-in CTA (hidden on login pages). */
  showLoginCta?: boolean;
  loginLabel?: string;
  /** Player portal: show public browse links without requiring login. */
  showPublicNav?: boolean;
}

/**
 * Top bar for unauthenticated surfaces. Player gets soft public navigation;
 * organizer is auth-only (no public browse).
 */
export function PublicTopBar({
  portal = 'player',
  showLoginCta = true,
  loginLabel,
  showPublicNav = portal === 'player',
}: PublicTopBarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const home = getPortalHome(portal);

  const navIcon = (icon: 'home' | 'search' | 'leaderboard' | 'camps' | 'teams') => {
    if (icon === 'home') return <HomeIcon fontSize="small" />;
    if (icon === 'search') return <SearchIcon fontSize="small" />;
    if (icon === 'teams') return <GroupsIcon fontSize="small" />;
    if (icon === 'camps') return <EmojiEventsIcon fontSize="small" />;
    return <EmojiEventsIcon fontSize="small" />;
  };

  return (
    <>
      <Link
        href="#main-content"
        sx={{
          position: 'fixed',
          left: 8,
          top: 8,
          zIndex: 9999,
          bgcolor: 'background.paper',
          color: 'text.primary',
          px: 2,
          py: 1,
          borderRadius: 1,
          textDecoration: 'none',
          transform: 'translateY(-200%)',
          '&:focus': { transform: 'translateY(0)' },
        }}
      >
        {t('a11y.skipToContent')}
      </Link>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        component="nav"
        aria-label={t('a11y.mainNav')}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(8,8,10,0.72)',
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: { xs: 56, sm: 64 } }}>
          <Box
            component={RouterLink}
            to={home}
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/fragbase-logo.png"
              alt="Fragbase"
              sx={{ width: 32, height: 32, borderRadius: 999 }}
            />
            <Stack spacing={0} sx={{ lineHeight: 1 }}>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: 'common.white' }}>
                Fragbase
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                {portal === 'organizer'
                  ? t('publicNav.organizerBadge')
                  : t('publicNav.playerBadge')}
              </Typography>
            </Stack>
          </Box>

          {portal === 'organizer' && (
            <Chip
              size="small"
              icon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />}
              label={t('publicNav.organizerOnly')}
              variant="outlined"
              sx={{ borderColor: 'rgba(255,255,255,0.2)', fontWeight: 600 }}
            />
          )}

          {showPublicNav && portal === 'player' && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ flexGrow: 1, overflow: 'hidden', ml: { xs: 0, sm: 1 } }}
            >
              {playerPublicNav.map((item) => {
                const active = isPublicNavActive(location.pathname, item.to);
                return (
                  <Button
                    key={item.key}
                    component={RouterLink}
                    to={item.to}
                    size="small"
                    color="inherit"
                    startIcon={navIcon(item.icon)}
                    sx={{
                      fontWeight: active ? 700 : 500,
                      color: active ? 'common.white' : 'text.secondary',
                      bgcolor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    {t(`publicNav.${item.key}`)}
                  </Button>
                );
              })}
            </Stack>
          )}

          <Box sx={{ flexGrow: showPublicNav ? 0 : 1 }} />

          <LanguageSwitcher />

          {showLoginCta && (
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              size="small"
              startIcon={portal === 'player' ? <SportsEsportsIcon /> : <AdminPanelSettingsIcon />}
              data-testid="public-login-cta"
              sx={{ fontWeight: 700, flexShrink: 0 }}
            >
              {loginLabel || t(portal === 'organizer' ? 'landing.organizer.primaryCta' : 'landing.signIn')}
            </Button>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
}

export default PublicTopBar;
