import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Alert, Stack, Typography } from '@mui/material';
import { SiDiscord, SiGithub, SiKeycloak } from 'react-icons/si';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../contexts/AuthContext';
import { SteamIcon } from '../icons/SteamIcon';
import { PortalId } from '../../config/portals';
import { GlassCard } from '../../shared/ui';

export interface AuthSignInCardProps {
  portal?: PortalId;
  /** Hide logo block (organizer split layout). */
  compact?: boolean;
}

/**
 * Glass sign-in card — shared by player login page and organizer auth gate.
 */
export function AuthSignInCard({ portal = 'player', compact = false }: AuthSignInCardProps) {
  const { t } = useTranslation();
  const { loginWithSteam } = useAuth();
  const [providers, setProviders] = useState<
    Array<{
      id: string;
      label: string;
      loginUrl: string;
      enabled: boolean;
      buttonLabel?: string;
      buttonBgColor?: string;
      buttonTextColor?: string;
      buttonHoverBgColor?: string;
    }>
  >([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const hasLoadedProvidersRef = useRef(false);
  const appVersion = __APP_VERSION__;

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoadingProviders(true);
        setProvidersError(null);
        const response = await fetch('/api/auth/providers');
        if (!response.ok) {
          throw new Error(`Failed to load auth providers: ${response.status}`);
        }
        const data: {
          success: boolean;
          providers?: Array<{
            id: string;
            label: string;
            loginUrl: string;
            enabled: boolean;
            buttonLabel?: string;
            buttonBgColor?: string;
            buttonTextColor?: string;
            buttonHoverBgColor?: string;
          }>;
          error?: string;
        } = await response.json();
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid auth providers response');
        }
        const enabledProviders = (Array.isArray(data.providers) ? data.providers : []).filter(
          (p) => p.enabled
        );
        setProviders(enabledProviders);
        if (!data.success || enabledProviders.length === 0) {
          throw new Error(
            data.error ||
              'No sign-in providers are configured. Please configure Steam or another SSO provider on the server.'
          );
        }
      } catch (error) {
        console.error(error);
        setProvidersError(
          error instanceof Error
            ? error.message
            : 'Failed to load sign-in options. Please try again or check server logs.'
        );
      } finally {
        setLoadingProviders(false);
      }
    };

    if (!hasLoadedProvidersRef.current) {
      hasLoadedProvidersRef.current = true;
      void loadProviders();
    }
  }, []);

  const handleProviderClick = (providerId: string, loginUrl: string) => {
    if (providerId === 'steam') {
      loginWithSteam();
      return;
    }
    window.location.href = loginUrl;
  };

  return (
    <GlassCard
      elevation={0}
      sx={{
        p: { xs: 4, md: 5 },
        width: '100%',
        maxWidth: 440,
        mx: 'auto',
        backgroundColor: 'background.paper',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: 'none',
      }}
    >
      <Stack spacing={4} alignItems="center">
        <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
          {!compact && (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <img
                src="/fragbase-logo.png"
                alt="Fragbase"
                style={{ width: '88px', height: '88px', borderRadius: '999px' }}
              />
            </Box>
          )}
          <Stack spacing={0.5} alignItems="center" sx={{ textAlign: 'center', px: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              {t([`login.${portal}.welcome`, 'login.welcome'])}
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth={360}>
              {t([`login.${portal}.subtitle`, 'login.subtitle'])}
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={2.5} sx={{ width: '100%' }}>
          {providersError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">{providersError}</Typography>
            </Alert>
          )}
          <Stack spacing={1.5}>
            {providers.map((provider) => {
              const isSteam = provider.id === 'steam';
              const isDiscord = provider.id === 'discord';
              const isGitHub = provider.id === 'github';
              const isKeycloak = provider.id === 'keycloak';
              const { variant, color, sx, icon } = (() => {
                if (isSteam) {
                  return {
                    variant: 'contained' as const,
                    color: 'primary' as const,
                    sx: { bgcolor: '#171a21', color: '#ffffff', '&:hover': { bgcolor: '#1b2838' } },
                    icon: <SteamIcon />,
                  };
                }
                if (isDiscord) {
                  return {
                    variant: 'contained' as const,
                    color: 'inherit' as const,
                    sx: { bgcolor: '#5865F2', color: '#ffffff', '&:hover': { bgcolor: '#4752c4' } },
                    icon: <SiDiscord />,
                  };
                }
                if (isGitHub) {
                  return {
                    variant: 'contained' as const,
                    color: 'inherit' as const,
                    sx: { bgcolor: '#24292e', color: '#ffffff', '&:hover': { bgcolor: '#1b1f23' } },
                    icon: <SiGithub />,
                  };
                }
                if (isKeycloak) {
                  const bg = provider.buttonBgColor || '#3262a8';
                  const text = provider.buttonTextColor || '#ffffff';
                  const hoverBg = provider.buttonHoverBgColor || '#274c82';
                  return {
                    variant: 'contained' as const,
                    color: 'inherit' as const,
                    sx: { bgcolor: bg, color: text, '&:hover': { bgcolor: hoverBg } },
                    icon: <SiKeycloak />,
                  };
                }
                return {
                  variant: 'outlined' as const,
                  color: 'inherit' as const,
                  sx: undefined,
                  icon: undefined,
                };
              })();
              return (
                <Button
                  key={provider.id}
                  fullWidth
                  size="large"
                  variant={variant}
                  color={color}
                  sx={sx}
                  onClick={() => handleProviderClick(provider.id, provider.loginUrl)}
                  startIcon={icon}
                  disabled={loadingProviders}
                  data-testid={
                    isSteam ? 'login-steam-sign-in-button' : `login-${provider.id}-sign-in-button`
                  }
                >
                  {provider.buttonLabel || `Sign in with ${provider.label}`}
                </Button>
              );
            })}
            {loadingProviders && providers.length === 0 && (
              <Button fullWidth size="large" variant="contained" disabled>
                {t('login.signingIn')}
              </Button>
            )}
          </Stack>
        </Stack>

        {portal === 'player' && (
          <Button
            component={RouterLink}
            to="/"
            size="small"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'text.secondary' }}
          >
            {t('landing.back')}
          </Button>
        )}

        <Typography variant="caption" color="text.secondary">
          {t('login.version')} {appVersion || 'Unknown'}
        </Typography>
      </Stack>
    </GlassCard>
  );
}

export default AuthSignInCard;
