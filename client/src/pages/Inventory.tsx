import { useEffect } from 'react';
import { Box, Typography, Alert, Button, Card, CardContent } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Inventory2Icon from '@mui/icons-material/Inventory2';

const INVENTORY_URL = 'https://inventory.cstrike.app';

export default function Inventory() {
  useEffect(() => { document.title = 'FULM: Inventory'; }, []);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 6, px: 3 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 5 }}>
          <Inventory2Icon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Weapon Skins
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Customize your weapon skins on the inventory site. After making changes, type <strong>/ws</strong> in the in-game chat to refresh your skins on the server.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<OpenInNewIcon />}
            href={INVENTORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ px: 4, py: 1.5, fontWeight: 700, fontSize: '1rem', borderRadius: 3 }}
          >
            Open Inventory
          </Button>
          <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
            <strong>How to use:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>Click the button above to open the inventory site</li>
              <li>Sign in with your Steam account</li>
              <li>Select and customize your weapon skins</li>
              <li>Join the CS2 server and type <strong>/ws</strong> in chat to apply</li>
            </ol>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
