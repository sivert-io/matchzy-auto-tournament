import React from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { MatchConfig } from '../../types';

interface ManualMatchReviewStepProps {
  config: MatchConfig | null;
  onOpenSaveTemplate: () => void;
}

export const ManualMatchReviewStep: React.FC<ManualMatchReviewStepProps> = ({
  config,
  onOpenSaveTemplate,
}) => {
  const json = React.useMemo(() => (config ? JSON.stringify(config, null, 2) : ''), [config]);
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async (): Promise<boolean> => {
    if (!json) return false;
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      // Fallback for insecure contexts / older browsers.
      try {
        const ta = document.createElement('textarea');
        ta.value = json;
        ta.setAttribute('readonly', 'true');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  if (!config) {
    return (
      <Typography variant="body2" color="text.secondary">
        Complete the maps and rules on the previous step to see the final MatchZy config preview.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={600}>
          Match Config (JSON)
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={copied ? 'Copied' : 'Copy JSON'}>
            <IconButton
              size="small"
              aria-label="copy match json"
              onClick={async () => {
                const ok = await copyToClipboard();
                if (!ok) return;
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" size="small" onClick={onOpenSaveTemplate}>
            Save as template
          </Button>
        </Box>
      </Box>
      <Box
        component="pre"
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 1.5,
          fontSize: 12,
          maxHeight: 260,
          overflow: 'auto',
        }}
      >
        {json}
      </Box>
    </Stack>
  );
};


