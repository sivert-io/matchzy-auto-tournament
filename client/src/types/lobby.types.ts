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

export interface LobbyVetoState {
  availableMaps: string[];
  bannedMaps: string[];
  pickedMaps: string[];
  actions: VetoAction[];
  currentTurn: 'team1' | 'team2';
  currentAction: 'ban' | 'pick';
  completed: boolean;
  turnDeadline?: number;
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
  veto?: LobbyVetoState;
}

export interface Lobby {
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
