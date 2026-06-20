import { PortalId } from '../config/portals';
import { AuthSignInCard } from '../components/auth/AuthSignInCard';
import PlayerLoginPage from '../pages/public/PlayerLoginPage';

interface LoginProps {
  portal?: PortalId;
  /** @deprecated Use OrgAuthPage layout; kept for tests and legacy imports. */
  embedded?: boolean;
}

/** Legacy route component — player uses PlayerLoginPage in public shell. */
export default function Login({ portal = 'player', embedded = false }: LoginProps) {
  if (portal === 'player' && !embedded) {
    return <PlayerLoginPage />;
  }
  return <AuthSignInCard portal={portal} compact={embedded} />;
}
