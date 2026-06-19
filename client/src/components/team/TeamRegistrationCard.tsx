import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, CardContent, Chip, Stack, Typography } from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { GlassCard } from '../../shared/ui';

type RegistrationStatus = {
  canRegister: boolean;
  registered: boolean;
  feeCents: number;
  currency: string;
  isCaptain?: boolean;
  registration?: { status: string; payment_status: string };
  tournamentType?: string;
  tournamentStatus?: string;
};

export function TeamRegistrationCard({ teamId }: { teamId: string }) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useSnackbar();
  const { playerSteamId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await api.get<RegistrationStatus & { success?: boolean }>(
        `/api/registrations/team/${teamId}`
      );
      setStatus(response);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const result = searchParams.get('registration');
    if (result === 'success') {
      showSuccess(t('teamPage.registration.paymentSuccess'));
      setSearchParams({}, { replace: true });
      void loadStatus();
    } else if (result === 'failure') {
      showError(t('teamPage.registration.paymentFailure'));
      setSearchParams({}, { replace: true });
    } else if (result === 'pending') {
      showSuccess(t('teamPage.registration.paymentPending'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, showSuccess, showError, t, loadStatus]);

  const handleRegister = async () => {
    setSubmitting(true);
    try {
      const response = await api.post<{
        success: boolean;
        checkoutUrl?: string;
        alreadyRegistered?: boolean;
        status?: string;
      }>(`/api/registrations/team/${teamId}`);

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
        return;
      }

      if (response.alreadyRegistered) {
        showSuccess(t('teamPage.registration.alreadyRegistered'));
      } else {
        showSuccess(t('teamPage.registration.registerSuccess'));
      }
      await loadStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('teamPage.registration.registerError');
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!playerSteamId || loading) {
    return null;
  }

  if (!status || status.tournamentType === 'shuffle') {
    return null;
  }

  const feeLabel =
    status.feeCents > 0
      ? t('teamPage.registration.feeLabel', {
          amount: (status.feeCents / 100).toFixed(2),
          currency: status.currency,
        })
      : t('teamPage.registration.free');

  return (
    <GlassCard sx={{ p: 0 }}>
      <CardContent>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <PaymentIcon color="primary" aria-hidden />
            <Typography variant="h6" fontWeight={700}>
              {t('teamPage.registration.title')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t('teamPage.registration.description')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={feeLabel} />
            {status.registered && (
              <Chip size="small" color="success" label={t('teamPage.registration.registeredChip')} />
            )}
          </Stack>
          {status.canRegister && (
            <Button
              variant="contained"
              disabled={submitting}
              onClick={() => void handleRegister()}
              data-testid="team-register-tournament"
            >
              {submitting
                ? t('teamPage.registration.registering')
                : status.feeCents > 0
                  ? t('teamPage.registration.payAndRegister')
                  : t('teamPage.registration.registerCta')}
            </Button>
          )}
          {!status.isCaptain && !status.registered && (
            <Typography variant="caption" color="text.secondary">
              {t('teamPage.registration.captainOnly')}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </GlassCard>
  );
}
