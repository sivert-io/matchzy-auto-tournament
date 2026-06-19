import React from 'react';
import { CardContent, Stepper, Step, StepLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../shared/ui';

interface TournamentStepperProps {
  currentStep: number;
}

export const TournamentStepper: React.FC<TournamentStepperProps> = ({ currentStep }) => {
  const { t } = useTranslation();

  return (
    <GlassCard sx={{ mb: 3 }}>
      <CardContent>
        <Stepper activeStep={currentStep} alternativeLabel>
          <Step>
            <StepLabel>{t('tournament.steps.create')}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t('tournament.steps.review')}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t('tournament.steps.live')}</StepLabel>
          </Step>
        </Stepper>
      </CardContent>
    </GlassCard>
  );
};
