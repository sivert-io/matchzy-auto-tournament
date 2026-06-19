import { AppBar, Box, Button, Link, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

interface PublicTopBarProps {
  /**
   * Show the primary "Enter / Sign in" call-to-action. Hidden on the login
   * page itself (where the providers are already on screen).
   */
  showLoginCta?: boolean;
  /** Login button label override (defaults to a generic "Sign in"). */
  loginLabel?: string;
}

/**
 * Lightweight top bar for the public surfaces (landing + login). Unlike
 * {@link SharedNavBar} it does not poll lobby/match state or assume a
 * signed-in user — it's just the brand, language switcher and a sign-in CTA.
 */
export function PublicTopBar({ showLoginCta = true, loginLabel }: PublicTopBarProps) {
  const { t } = useTranslation();

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
      <AppBar position="static" color="default" elevation={1} component="nav" aria-label={t('a11y.mainNav')}>
      <Toolbar sx={{ gap: 2 }}>
        <Box
          component={RouterLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            bgcolor: '#000',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 999,
            px: 1.25,
            py: 0.5,
          }}
        >
          <Box
            component="img"
            src="/fragbase-logo.png"
            alt="Fragbase"
            sx={{ width: 28, height: 28, borderRadius: 999 }}
          />
          <Typography
            sx={{ fontSize: '1rem', fontWeight: 800, color: '#fff', ml: 1, lineHeight: 1 }}
          >
            Fragbase
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <LanguageSwitcher />

        {showLoginCta && (
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="small"
            data-testid="public-login-cta"
          >
            {loginLabel || t('landing.signIn')}
          </Button>
        )}
      </Toolbar>
    </AppBar>
    </>
  );
}

export default PublicTopBar;
