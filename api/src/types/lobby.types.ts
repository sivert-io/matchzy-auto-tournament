export type LobbyStatus = 'waiting' | 'picking' | 'veto' | 'ready' | 'cancelled';
export type LobbyFormat = 'bo1' | 'bo3' | 'bo5';
export type LobbyTeam = 'unassigned' | 'team1' | 'team2';

export interface GameMode {
  id: string;
  name: string;
  commands: string[];
}

export interface LobbyPlayer {
  steamId: string;
  name: string;
  avatar?: string;
  team: LobbyTeam;
  isCaptain: boolean;
  joinedAt: number;
}

export interface VetoAction {
  team: 'team1' | 'team2';
  action: 'ban' | 'pick';
  map: string;
}

export interface LobbyState {
  lobbyName?: string;
  team1Name?: string;
  team2Name?: string;
  players: LobbyPlayer[];
  captains: {
    team1?: string;
    team2?: string;
  };
  pickTurn?: 'team1' | 'team2';
  pickOrder: string[];
  veto?: {
    availableMaps: string[];
    bannedMaps: string[];
    pickedMaps: string[];
    actions: VetoAction[];
    currentTurn: 'team1' | 'team2';
    currentAction: 'ban' | 'pick';
    completed: boolean;
    turnDeadline?: number;
  };
}

export interface LobbyRow {
  id: string;
  status: LobbyStatus;
  created_by: string;
  team_size: number;
  map_pool: string;
  format: LobbyFormat;
  game_mode: string;
  match_slug: string | null;
  lobby_state: string;
  created_at: number;
  updated_at: number;
}

export interface LobbyResponse {
  id: string;
  status: LobbyStatus;
  createdBy: string;
  teamSize: number;
  mapPool: string[];
  format: LobbyFormat;
  gameMode: string;
  matchSlug: string | null;
  state: LobbyState;
  server?: { id: string; name: string; host: string; port: number };
  matchStatus?: string;
  createdAt: number;
  updatedAt: number;
}
