import React from 'react';
import { AppBar, Toolbar } from '@mui/material';
import { SharedNavBar } from './SharedNavBar';
import { PortalId } from '../../config/portals';

export const TopNavBar: React.FC<{ portal?: PortalId }> = ({ portal = 'player' }) => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <SharedNavBar portal={portal} />
      </Toolbar>
    </AppBar>
  );
};

