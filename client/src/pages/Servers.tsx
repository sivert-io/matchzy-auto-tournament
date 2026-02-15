import React, { useState, useEffect, useCallback } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { Box, Button, Card, CardContent, Typography, Grid, Chip, CircularProgress, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import BlockIcon from '@mui/icons-material/Block';
import UpdateIcon from '@mui/icons-material/Update';
import ReplayIcon from '@mui/icons-material/Replay';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { api } from '../utils/api';
import ServerModal from '../components/modals/ServerModal';
import BatchServerModal from '../components/modals/BatchServerModal';
import MatchDetailsModal from '../components/modals/MatchDetailsModal';
import { EmptyState } from '../components/shared/EmptyState';
import ConfirmDialog from '../components/modals/ConfirmDialog';
import type { Match, Server, ServersResponse, MatchesResponse } from '../types';
import { useSnackbar } from '../contexts/SnackbarContext';
import { getRoundLabel } from '../utils/matchUtils';
import { useTranslation } from 'react-i18next';

type StepState = 'pending' | 'ok' | 'fail' | 'warn';

type SemVer = { major: number; minor: number; patch: number };
function parseSemVer(input: string | null | undefined): SemVer | null {
  if (!input) return null;
  const m = input.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function isSemVerBehind(current: string | null | undefined, latest: string | null | undefined): boolean | null {
  const cur = parseSemVer(current);
  const lat = parseSemVer(latest);
  if (!cur || !lat) return null;
  return compareSemVer(cur, lat) < 0;
}

function getServerReadiness(server: Server) {
  const hbAt = server.heartbeatUpdatedAt ?? null;
  const heartbeatSeen = typeof hbAt === 'number';
  const now = Math.floor(Date.now() / 1000);
  // MatchZy Enhanced heartbeats are ~15s steady-state; keep UI window above that to avoid flapping.
  const HEARTBEAT_FRESH_SECONDS = 45;
  const heartbeatRecent = heartbeatSeen ? now - (hbAt as number) <= HEARTBEAT_FRESH_SECONDS : false;
  const heartbeatStep: StepState = !heartbeatSeen ? 'pending' : heartbeatRecent ? 'ok' : 'warn';
  const configStep: StepState = server.persistentConfigSent ? 'ok' : 'pending';

  const shouldGhost = !heartbeatSeen;

  return { shouldGhost, configStep, heartbeatStep, heartbeatSeen, heartbeatRecent };
}

function StepRow(props: { label: string; state: StepState; detail?: string }) {
  const { label, state, detail } = props;
  const icon =
    state === 'ok' ? (
      <CheckCircleIcon sx={{ fontSize: 16 }} />
    ) : state === 'fail' ? (
      <ErrorOutlineIcon sx={{ fontSize: 16 }} />
    ) : state === 'warn' ? (
      <WarningAmberIcon sx={{ fontSize: 16 }} />
    ) : state === 'pending' ? (
      <ScheduleIcon sx={{ fontSize: 16 }} />
    ) : (
      <HelpOutlineIcon sx={{ fontSize: 16 }} />
    );

  const color =
    state === 'ok'
      ? 'success.main'
      : state === 'fail'
      ? 'error.main'
      : state === 'warn'
      ? 'warning.main'
      : 'text.secondary';

  return (
    <Box display="flex" alignItems="start" gap={1} sx={{ color }}>
      <Box mt="2px">{icon}</Box>
      <Box flex={1}>
        <Typography variant="body2" fontWeight={700} sx={{ color: 'inherit', lineHeight: 1.25 }}>
          {label}
        </Typography>
        {detail && (
          <Typography variant="caption" display="block" mt={0.25} sx={{ color: 'inherit', opacity: 0.9 }}>
            {detail}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function Servers() {
  const { setHeaderActions } = usePageHeader();
  const [servers, setServers] = useState<Server[]>([]);
  const { showError, showSnackbar, closeSnackbar } = useSnackbar();
  const [modalOpen, setModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loadingMatchServerId, setLoadingMatchServerId] = useState<string | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationStatus, setAllocationStatus] = useState<{
    availableServerCount: number;
    requiredServerCount: number;
    gracePeriodSeconds: number;
    nextAllocationInSeconds: number | null;
    servers: Array<{
      id: string;
      name: string;
      online: boolean;
      status: string | null;
      matchSlug: string | null;
      updatedAt: number | null;
      inGraceWindow: boolean;
      secondsUntilReady: number | null;
      allocatable: boolean;
    }>;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedServerIds, setSelectedServerIds] = useState<Set<string>>(() => new Set());
  const [retryingServerId, setRetryingServerId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [matchzyLatest, setMatchzyLatest] = useState<{ version: string; releaseUrl: string } | null>(null);
  const { t } = useTranslation();

  const loadMatchzyLatestVersion = useCallback(async () => {
    try {
      const resp = await api.get<{
        success: boolean;
        version?: string;
        releaseUrl?: string;
      }>('/api/matchzy/latest-version');

      if (resp?.success && typeof resp.version === 'string' && typeof resp.releaseUrl === 'string') {
        setMatchzyLatest({ version: resp.version, releaseUrl: resp.releaseUrl });
      }
    } catch {
      // Best-effort only; ignore failures (GitHub rate limits, offline, etc.)
    }
  }, []);

  // Set dynamic page title
  useEffect(() => {
    document.title = t('serversPage.title');
  }, [t]);

  const loadServers = useCallback(
    async (options?: { autoRetry?: boolean }) => {
    setRefreshing(true);
    try {
      const response = await api.get<ServersResponse>('/api/servers');
      const serverList = response.servers || [];

      // Determine an initial status without treating "no heartbeat yet" as offline.
      const serversWithStatus = serverList.map((s: Server) => {
        let initialStatus: string;
        if (!s.enabled) {
          initialStatus = 'disabled';
        } else if (!s.heartbeatUpdatedAt) {
          initialStatus = 'ghost'; // Waiting for first plugin heartbeat
        } else {
          const now = Math.floor(Date.now() / 1000);
          const HEARTBEAT_FRESH_SECONDS = 45;
          const isOnline = now - (s.heartbeatUpdatedAt as number) <= HEARTBEAT_FRESH_SECONDS;
          initialStatus = isOnline ? 'online' : 'offline';
        }
        
        return {
          ...s,
          status: initialStatus,
          currentMatch: s.heartbeatMatchSlug ?? null,
        };
      });
      setServers(serversWithStatus);

      // Auto-retry servers that need initialization (unless explicitly disabled)
      if (options?.autoRetry !== false) {
        const serversNeedingRetry: Server[] = [];
        
        serverList.forEach((server) => {
          const missingHeartbeat = !server.heartbeatUpdatedAt;
          const configSent = Boolean(server.persistentConfigSent);
          if (server.enabled && missingHeartbeat && configSent) {
            serversNeedingRetry.push(server);
          }
        });

        if (serversNeedingRetry.length > 0) {
          // Trigger auto-retry in background without blocking
          void (async () => {
            for (const server of serversNeedingRetry) {
              try {
                await api.post(`/api/servers/${server.id}/reset-initialization`);
                await new Promise((r) => setTimeout(r, 400));
              } catch (e) {
                console.warn(`Auto-retry failed for ${server.id}:`, e);
              }
            }
            // Reload after auto-retry completes
            setTimeout(() => void loadServers({ autoRetry: false }), 1500);
          })();
        }
      }
    } catch (err) {
      showError(t('serversPage.errors.loadServers'));
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  },
  [showError, t]);

  const loadAllocationStatus = useCallback(async () => {
    setAllocationLoading(true);
    try {
      const availability = await api.get<{
        success: boolean;
        availableServerCount: number;
        requiredServerCount: number;
        gracePeriodSeconds?: number;
        nextAllocationInSeconds?: number | null;
        servers?: Array<{
          id: string;
          name: string;
          online: boolean;
          status: string | null;
          matchSlug: string | null;
          updatedAt: number | null;
          inGraceWindow: boolean;
          secondsUntilReady: number | null;
          allocatable: boolean;
        }>;
        simulationEnabled?: boolean;
      }>('/api/tournament/server-availability');

      if (availability.success) {
        setAllocationStatus({
          availableServerCount: availability.availableServerCount,
          requiredServerCount: availability.requiredServerCount,
          gracePeriodSeconds: availability.gracePeriodSeconds ?? 120,
          nextAllocationInSeconds:
            typeof availability.nextAllocationInSeconds === 'number'
              ? availability.nextAllocationInSeconds
              : null,
          servers: availability.servers ?? [],
        });
      } else {
        setAllocationStatus(null);
      }
    } catch (err) {
      console.error('Failed to load server allocation status:', err);
    } finally {
      setAllocationLoading(false);
    }
  }, []);

  const uninitializedCount = React.useMemo(
    () => servers.filter((s) => s.enabled && !s.heartbeatUpdatedAt).length,
    [servers]
  );

  const handleRetryAllUninitialized = useCallback(async () => {
    const needRetry = servers.filter((s) => s.enabled && !s.heartbeatUpdatedAt);
    if (needRetry.length === 0 || retryingAll) return;

    setRetryingAll(true);
    const loadingKey = showSnackbar(
      `⏳ Retrying initialization for ${needRetry.length} server(s)...`,
      'info'
    );

    try {
      for (const server of needRetry) {
        await api.post(`/api/servers/${server.id}/reset-initialization`);
        await new Promise((r) => setTimeout(r, 500));
      }
      closeSnackbar(loadingKey);
      showSnackbar(`✅ Retry triggered for ${needRetry.length} server(s)`, 'success');
      setTimeout(() => void loadServers({ autoRetry: false }), 1500);
    } catch (error) {
      closeSnackbar(loadingKey);
      const raw = error instanceof Error ? error.message : String(error);
      let msg = raw;
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        if (typeof parsed?.error === 'string' && parsed.error.length > 0) {
          msg = parsed.error;
        }
      } catch {
        /* use raw */
      }
      showError(`❌ Retry failed: ${msg}`);
    } finally {
      setRetryingAll(false);
    }
  }, [
    servers,
    retryingAll,
    showSnackbar,
    closeSnackbar,
    showError,
    loadServers,
  ]);

  // Set header actions
  useEffect(() => {
    if (servers.length > 0) {
      const allSelected =
        servers.length > 0 && servers.every((server) => selectedServerIds.has(server.id));

      setHeaderActions(
        <Box display="flex" gap={2}>
          {!selectionMode && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={() => {
                  void loadServers({ autoRetry: false });
                  void loadAllocationStatus();
                }}
                disabled={refreshing}
              >
                {refreshing
                  ? t('serversPage.headerActions.refreshChecking')
                  : t('serversPage.headerActions.refresh')}
              </Button>
              {uninitializedCount > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  color="warning"
                  startIcon={
                    retryingAll ? (
                      <CircularProgress size={20} />
                    ) : (
                      <RefreshIcon />
                    )
                  }
                  onClick={() => void handleRetryAllUninitialized()}
                  disabled={retryingAll || refreshing}
                >
                  {retryingAll
                    ? t('serversPage.headerActions.retryUninitializedChecking')
                    : t('serversPage.headerActions.retryUninitialized', {
                        count: uninitializedCount,
                      })}
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setBatchModalOpen(true)}
              >
                {t('serversPage.headerActions.batchAdd')}
              </Button>
            </>
          )}
          {servers.length > 0 && (
            <>
              <Button
                variant={selectionMode ? 'contained' : 'outlined'}
                color={selectionMode ? 'secondary' : 'inherit'}
                size="small"
                onClick={() => {
                  setSelectionMode((prev) => !prev);
                  if (selectionMode) {
                    setSelectedServerIds(() => new Set());
                  }
                }}
              >
                {selectionMode
                  ? t('serversPage.headerActions.done')
                  : t('serversPage.headerActions.select')}
              </Button>
              {selectionMode && (
                <>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    disabled={servers.length === 0}
                    onClick={() => {
                      setSelectedServerIds((prev) => {
                        const next = new Set(prev);
                        if (allSelected) {
                          next.clear();
                        } else {
                          servers.forEach((server) => {
                            next.add(server.id);
                          });
                        }
                        return next;
                      });
                    }}
                  >
                    {allSelected
                      ? t('serversPage.headerActions.unselectAll')
                      : t('serversPage.headerActions.selectAll')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={selectedServerIds.size === 0}
                    onClick={() => {
                      if (selectedServerIds.size === 0) return;
                      setBulkDeleteConfirmOpen(true);
                    }}
                  >
                    {t('serversPage.headerActions.deleteSelected')}
                  </Button>
                </>
              )}
            </>
          )}
          {!selectionMode && (
            <Button
              data-testid="add-server-button"
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleOpenModal()}
            >
              {t('serversPage.headerActions.addServer')}
            </Button>
          )}
        </Box>
      );
    } else {
      setHeaderActions(null);
    }

    return () => {
      setHeaderActions(null);
    };
  }, [
    servers,
    refreshing,
    setHeaderActions,
    loadServers,
    loadAllocationStatus,
    selectionMode,
    selectedServerIds,
    uninitializedCount,
    retryingAll,
    handleRetryAllUninitialized,
    t,
  ]);

  useEffect(() => {
    // Initial page load uses cached status to avoid hammering servers when the
    // Always do full connectivity checks to show real server status (not cached)
    void loadServers({ autoRetry: true });
    void loadAllocationStatus();
    void loadMatchzyLatestVersion();
  }, [loadServers, loadAllocationStatus, loadMatchzyLatestVersion]);

  const handleOpenModal = (server?: Server) => {
    setEditingServer(server || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingServer(null);
  };

  const handleSave = async (createdIds?: string[]) => {
    await loadServers({ autoRetry: false });
    if (createdIds?.length) {
      const key = showSnackbar(`⏳ ${t('serversPage.autoConfig.configuring')}`, 'info');
      try {
        for (const id of createdIds) {
          try {
            await api.post(`/api/servers/${id}/reset-initialization`);
          } catch (e) {
            console.warn(`Auto-init failed for ${id}:`, e);
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        closeSnackbar(key);
        showSnackbar(`✅ ${t('serversPage.autoConfig.done')}`, 'success');
        setTimeout(() => void loadServers({ autoRetry: false }), 1500);
      } catch {
        closeSnackbar(key);
      }
    }
    handleCloseModal();
  };

  const handleViewCurrentMatch = async (server: Server, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!server.id) return;

    setLoadingMatchServerId(server.id);
    try {
      const response = await api.get<MatchesResponse & { tournamentStatus?: string }>(
        `/api/matches?serverId=${encodeURIComponent(server.id)}`
      );

      if (response.success && Array.isArray(response.matches) && response.matches.length > 0) {
        const activeMatches = response.matches.filter(
          (m) => m.status === 'live' || m.status === 'loaded'
        );
        const matchToShow = activeMatches[0] || response.matches[0];
        setSelectedMatch(matchToShow as Match);
      } else {
        showError('No matches found for this server');
      }
    } catch (err) {
      console.error('Failed to load current match for server', err);
      showError('Failed to load current match for this server');
    } finally {
      setLoadingMatchServerId(null);
    }
  };

  const toggleServerSelected = (serverId: string) => {
    setSelectedServerIds((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  const handleRetryInitialization = async (serverId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (retryingServerId || retryingAll) return;

    setRetryingServerId(serverId);
    
    // Show loading snackbar
    const loadingKey = showSnackbar('⏳ Sending persistent configuration to server...', 'info');
    
    try {
      await api.post(`/api/servers/${serverId}/reset-initialization`);
      
      // Dismiss loading snackbar and show success
      closeSnackbar(loadingKey);
      showSnackbar('✅ Server initialization triggered successfully', 'success');
      
      // Refresh server status after a short delay
      setTimeout(() => {
        void loadServers({ autoRetry: false });
      }, 1500);
    } catch (error) {
      closeSnackbar(loadingKey);
      const raw = error instanceof Error ? error.message : String(error);
      let msg = raw;
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        if (typeof parsed?.error === 'string' && parsed.error.length > 0) {
          msg = parsed.error;
        }
      } catch {
        /* use raw */
      }
      showError(`❌ Failed to retry initialization: ${msg}`);
    } finally {
      setRetryingServerId(null);
    }
  };

  // Sort servers by id: numeric suffix first (s_1, s_2, s_3), then by id string
  const sortedServers = React.useMemo(() => {
    const key = (id: string): [number, string] => {
      const m = id.match(/_(\d+)$/);
      return [m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER, id];
    };
    return [...servers].sort((a, b) => {
      const [na, sa] = key(a.id);
      const [nb, sb] = key(b.id);
      return na !== nb ? na - nb : sa.localeCompare(sb);
    });
  }, [servers]);

  // Calculate server statistics based on heartbeat tracking
  const serverStats = React.useMemo(() => {
    let online = 0;
    let offline = 0;
    let ghost = 0;
    let disabled = 0;
    
    servers.forEach((server) => {
      if (!server.enabled) {
        disabled++;
      } else if (!server.heartbeatUpdatedAt) {
        ghost++; // Enabled but no RU heartbeat received yet
      } else {
        const now = Math.floor(Date.now() / 1000);
        const HEARTBEAT_FRESH_SECONDS = 45;
        const secondsAgo = now - (server.heartbeatUpdatedAt as number);
        if (secondsAgo <= HEARTBEAT_FRESH_SECONDS) online++;
        else offline++;
      }
    });
    
    return { online, offline, ghost, disabled, total: servers.length };
  }, [servers]);

  // Detect CS2 update-required servers
  const cs2UpdateInfo = React.useMemo(() => {
    const outOfDate = servers.filter((s) => s.enabled && typeof s.cs2RequiredVersion === 'number');
    const byVersion = new Map<number, Server[]>();
    for (const s of outOfDate) {
      const v = s.cs2RequiredVersion as number;
      const list = byVersion.get(v) ?? [];
      list.push(s);
      byVersion.set(v, list);
    }
    const versions = Array.from(byVersion.keys()).sort((a, b) => b - a);
    return { outOfDate, byVersion, versions };
  }, [servers]);

  return (
    <Box data-testid="servers-page" sx={{ width: '100%', height: '100%' }}>
      {servers.length === 0 ? (
          <Box>
            <EmptyState
              icon={StorageIcon}
              title={t('serversPage.empty.title')}
              description={t('serversPage.empty.description')}
              actionLabel={t('serversPage.empty.addServer')}
              actionIcon={AddIcon}
              onAction={() => handleOpenModal()}
            />
            <Box display="flex" justifyContent="center" mt={2}>
              <Button variant="outlined" onClick={() => setBatchModalOpen(true)}>
                {t('serversPage.empty.batchAdd')}
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            {/* Server Statistics Summary */}
            <Box mb={2}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Server Fleet Status
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {serverStats.total} {serverStats.total === 1 ? 'Server' : 'Servers'}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={1}>
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body2" color="success.main">
                        <strong>{serverStats.online}</strong> Online
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CancelIcon sx={{ color: 'error.main', fontSize: 20 }} />
                      <Typography variant="body2" color="error.main">
                        <strong>{serverStats.offline}</strong> Offline
                      </Typography>
                    </Box>
                    {serverStats.ghost > 0 && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <BlockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                        <Typography variant="body2" color="text.disabled">
                          <strong>{serverStats.ghost}</strong> Awaiting heartbeat
                        </Typography>
                      </Box>
                    )}
                    {serverStats.disabled > 0 && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <BlockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                        <Typography variant="body2" color="text.disabled">
                          <strong>{serverStats.disabled}</strong> Disabled
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {cs2UpdateInfo.outOfDate.length > 0 && (
                    <Box
                      sx={{
                        bgcolor: 'error.light',
                        border: 2,
                        borderColor: 'error.main',
                        borderRadius: 2,
                        p: 2,
                        mt: 1.5,
                        color: 'grey.900',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        sx={{ color: 'inherit' }}
                        display="block"
                        mb={0.5}
                      >
                        🚨 CS2 servers out of date — update required
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'inherit' }} display="block">
                        {cs2UpdateInfo.outOfDate.length}{' '}
                        {cs2UpdateInfo.outOfDate.length === 1 ? 'server has' : 'servers have'} reported a required CS2
                        update from Steam. Update the server installation (SteamCMD/host) and restart.
                      </Typography>
                      <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                        {cs2UpdateInfo.versions.map((v) => (
                          <Chip
                            key={v}
                            label={`required_version=${v} (${cs2UpdateInfo.byVersion.get(v)?.length ?? 0})`}
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>

            {/* Match Allocation Status */}
            <Box mb={2}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    {t('serversPage.allocation.title')}
                  </Typography>
                  {!allocationStatus ? (
                    <Typography variant="body2" color="text.secondary">
                      {allocationLoading
                        ? t('serversPage.allocation.loading')
                        : t('serversPage.allocation.empty')}
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('serversPage.allocation.available')}</strong>{' '}
                        {allocationStatus.availableServerCount} / {allocationStatus.servers.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('serversPage.allocation.waiting')}</strong>{' '}
                        {allocationStatus.requiredServerCount}
                      </Typography>
                      {allocationStatus.nextAllocationInSeconds !== null && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          {t('serversPage.allocation.nextPass', {
                            seconds: allocationStatus.nextAllocationInSeconds,
                          })}
                        </Typography>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>

            <Grid container spacing={2}>
              {sortedServers.map((server) => {
                const allocSnapshot = allocationStatus?.servers.find((s) => s.id === server.id);
                const inGraceWindow = !!allocSnapshot?.inGraceWindow;
                const secondsUntilReady = allocSnapshot?.secondsUntilReady ?? null;

                const readiness = getServerReadiness(server);
                const awaitingHeartbeat = server.enabled && !server.heartbeatUpdatedAt;
                const showReadiness = awaitingHeartbeat;

                return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={server.id}>
                <Card
                  data-testid={`server-card-${server.name.replace(/\s+/g, '-').toLowerCase()}`}
                  sx={(theme) => {
                    const selected = selectedServerIds.has(server.id);
                    const ring = `0 0 0 2px ${theme.palette.primary.main}`;
                    const hoverShadow = selected
                      ? `${ring}, ${theme.shadows[6]}`
                      : theme.shadows[6];
                    return {
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s, background-color 0.2s',
                      border: awaitingHeartbeat ? 2 : 0,
                      borderRadius: 2,
                      borderStyle: awaitingHeartbeat ? 'dashed' : 'solid',
                      borderColor: !awaitingHeartbeat
                        ? 'transparent'
                        : server.persistentConfigSent
                        ? 'info.main'
                        : 'text.disabled',
                      opacity: readiness.shouldGhost ? 0.6 : 1,
                      boxShadow: selected ? ring : undefined,
                      ...(selected && {
                        bgcolor: 'action.selected',
                      }),
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: hoverShadow,
                        ...(selected && {
                          bgcolor: 'action.selected',
                        }),
                      },
                    };
                  }}
                  onClick={() => {
                    if (selectionMode) {
                      toggleServerSelected(server.id);
                    } else {
                      handleOpenModal(server);
                    }
                  }}
                >
                  <CardContent>
                    {typeof server.cs2RequiredVersion === 'number' && server.enabled && (
                      <Box
                        sx={{
                          bgcolor: 'error.light',
                          border: 2,
                          borderColor: 'error.main',
                          borderRadius: 1,
                          p: 1.5,
                          mb: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          color: 'grey.900',
                        }}
                      >
                        <UpdateIcon sx={{ color: 'inherit', fontSize: 20 }} aria-label="CS2 update required" />
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight={800} sx={{ color: 'inherit' }}>
                            CS2 update required
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                            mt={0.25}
                            sx={{ color: 'inherit', opacity: 0.9 }}
                          >
                            required_version={server.cs2RequiredVersion}
                            {server.cs2UpdatePhase ? ` • phase=${server.cs2UpdatePhase}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    {showReadiness && (
                      <Box
                        sx={{
                          bgcolor: 'transparent',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1.5,
                          mb: 2,
                          opacity: readiness.shouldGhost ? 0.85 : 1,
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" fontWeight={800}>
                            Setup steps
                          </Typography>
                          {server.persistentConfigSent ? (
                            <Typography variant="caption" color="text.secondary">
                              Config: sent
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Config: not sent
                            </Typography>
                          )}
                        </Box>

                        <Box display="flex" flexDirection="column" gap={0.75}>
                          <StepRow
                            label="Persistent config"
                            state={readiness.configStep}
                            detail={
                              readiness.configStep === 'ok'
                                ? 'Config sent via RCON.'
                                : 'Click Retry to send config via RCON.'
                            }
                          />
                          <StepRow
                            label="MatchZy Enhanced heartbeat"
                            state={readiness.heartbeatStep}
                            detail={
                              readiness.heartbeatStep === 'pending'
                                ? 'Waiting for MatchZy Enhanced to contact MAT…'
                                : readiness.heartbeatStep === 'warn'
                                ? 'Heartbeat seen, but stale.'
                                : 'Heartbeat OK.'
                            }
                          />
                        </Box>
                      </Box>
                    )}
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box flex={1}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {server.name}
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {(() => {
                            const chipSx = { fontWeight: 800 } as const;
                            const pendingSx = { ...chipSx, opacity: 0.6 } as const;

                            return (
                              <>
                                <Chip
                                  icon={
                                    readiness.configStep === 'ok' ? <CheckCircleIcon /> : <ScheduleIcon />
                                  }
                                  label="Config"
                                  size="small"
                                  variant="outlined"
                                  color={
                                    readiness.configStep === 'ok' ? 'success' : 'default'
                                  }
                                  sx={readiness.configStep === 'ok' ? chipSx : pendingSx}
                                />
                                <Chip
                                  icon={
                                    readiness.heartbeatStep === 'ok' ? (
                                      <CheckCircleIcon />
                                    ) : readiness.heartbeatStep === 'warn' ? (
                                      <WarningAmberIcon />
                                    ) : (
                                      <ScheduleIcon />
                                    )
                                  }
                                  label="Online"
                                  size="small"
                                  variant="outlined"
                                  color={
                                    readiness.heartbeatStep === 'ok'
                                      ? 'success'
                                      : readiness.heartbeatStep === 'warn'
                                      ? 'warning'
                                      : 'default'
                                  }
                                  sx={readiness.heartbeatStep === 'pending' ? pendingSx : chipSx}
                                />
                                <Chip
                                  icon={
                                    readiness.heartbeatStep === 'ok' ? (
                                      <CheckCircleIcon />
                                    ) : readiness.heartbeatStep === 'warn' ? (
                                      <WarningAmberIcon />
                                    ) : (
                                      <ScheduleIcon />
                                    )
                                  }
                                  label={readiness.heartbeatStep === 'warn' ? 'Heartbeat (stale)' : 'Heartbeat'}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    readiness.heartbeatStep === 'ok'
                                      ? 'success'
                                      : readiness.heartbeatStep === 'warn'
                                      ? 'warning'
                                      : 'default'
                                  }
                                  sx={readiness.heartbeatStep === 'pending' ? pendingSx : chipSx}
                                />
                              </>
                            );
                          })()}
                          {server.heartbeatStatus && (
                            <Chip
                              label={`State: ${server.heartbeatStatus}`}
                              size="small"
                              variant="outlined"
                              color="info"
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                          {server.heartbeatReadyForAllocation === true && (
                            <Chip
                              label="Allocatable"
                              size="small"
                              variant="outlined"
                              color="success"
                              sx={{ fontWeight: 800 }}
                            />
                          )}
                          {server.heartbeatPluginVersion && (
                            (() => {
                              const behind = isSemVerBehind(server.heartbeatPluginVersion, matchzyLatest?.version);
                              const updateAvailable = behind === true;
                              const latest = matchzyLatest?.version ?? null;
                              const releaseUrl = matchzyLatest?.releaseUrl ?? null;

                              const title = updateAvailable
                                ? `MatchZy Enhanced update available: v${latest}`
                                : 'MatchZy Enhanced version reported by server heartbeat';

                              return (
                                <Tooltip
                                  arrow
                                  title={
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {title}
                                      </Typography>
                                      {updateAvailable && releaseUrl && (
                                        <Typography variant="body2">Click to open the latest release.</Typography>
                                      )}
                                    </Box>
                                  }
                                >
                                  <Chip
                                    icon={updateAvailable ? <UpdateIcon /> : undefined}
                                    label={`MZ v${server.heartbeatPluginVersion}`}
                                    size="small"
                                    variant="outlined"
                                    color={updateAvailable ? 'warning' : 'default'}
                                    clickable={updateAvailable && Boolean(releaseUrl)}
                                    onClick={
                                      updateAvailable && releaseUrl
                                        ? (e) => {
                                            e.stopPropagation();
                                            window.open(releaseUrl, '_blank', 'noopener,noreferrer');
                                          }
                                        : undefined
                                    }
                                    sx={{ fontWeight: 600 }}
                                  />
                                </Tooltip>
                              );
                            })()
                          )}
                          {typeof server.cs2BuildId === 'number' && server.enabled && (
                            <Chip
                              label={`CS2 build ${server.cs2BuildId}`}
                              size="small"
                              variant="outlined"
                              color="secondary"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                          {typeof server.cs2RequiredVersion === 'number' && server.enabled && (
                            <Tooltip
                              arrow
                              title={
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    CS2 update required
                                  </Typography>
                                  <Typography variant="body2">
                                    MAT verified this server’s build is behind Steam. It will be blocked from new allocations
                                    (and tournament start) until updated.
                                  </Typography>
                                </Box>
                              }
                            >
                              <Chip
                                label={`CS2 update required (${server.cs2RequiredVersion})`}
                                size="small"
                                color="error"
                                sx={{ fontWeight: 700 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                        <Tooltip title="Retry server initialization (send persistent config via RCON)">
                        <IconButton
                          size="small"
                          onClick={(e) => handleRetryInitialization(server.id, e)}
                          disabled={retryingServerId === server.id || retryingAll}
                          sx={{
                            ml: 1,
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          {retryingServerId === server.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <ReplayIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={0.5} mb={2}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        data-testid="server-host"
                      >
                        <strong>{t('serversPage.labels.host')}</strong> {server.host}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('serversPage.labels.port')}</strong> {server.port}
                      </Typography>
                      {server.hostname && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>CS2 Name:</strong> {server.hostname}
                          </Typography>
                        </Box>
                      )}
                      {server.heartbeatPluginVersion && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <UpdateIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong>MatchZy Enhanced:</strong> v{server.heartbeatPluginVersion}
                          </Typography>
                        </Box>
                      )}
                      {typeof server.cs2BuildId === 'number' && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <UpdateIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong>CS2:</strong> build {server.cs2BuildId}
                          </Typography>
                        </Box>
                      )}
                      {server.heartbeatUpdatedAt && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          {(() => {
                            const now = Math.floor(Date.now() / 1000);
                            const secondsAgo = now - (server.heartbeatUpdatedAt as number);
                            const minutesAgo = Math.floor(secondsAgo / 60);
                            const hoursAgo = Math.floor(minutesAgo / 60);
                            const daysAgo = Math.floor(hoursAgo / 24);
                            
                            let timeStr;
                            if (secondsAgo < 60) {
                              timeStr = 'just now';
                            } else if (minutesAgo < 60) {
                              timeStr = `${minutesAgo}m ago`;
                            } else if (hoursAgo < 24) {
                              timeStr = `${hoursAgo}h ago`;
                            } else {
                              timeStr = `${daysAgo}d ago`;
                            }
                            
                            const isActive = secondsAgo < 20;
                            return (
                              <span style={{ 
                                color: isActive ? '#4caf50' : '#9e9e9e',
                                fontWeight: isActive ? 600 : 400 
                              }}>
                                ⏱️ Heartbeat {timeStr}
                              </span>
                            );
                          })()}
                        </Typography>
                      )}
                    </Box>
                    {inGraceWindow && typeof secondsUntilReady === 'number' && secondsUntilReady > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>{t('serversPage.allocation.cooldownLabel')}:</strong>{' '}
                          {t('serversPage.allocation.cooldownEta', {
                            seconds: secondsUntilReady,
                          })}
                        </Typography>
                      </Box>
                    )}
                    {server.status === 'online' && (server.currentMatch || (server as Server & { queuedMatch?: string | null }).queuedMatch) && (
                      <Box display="flex" flexDirection="column" gap={0.5} mt={1}>
                        {server.currentMatch && (
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Chip
                          label={server.currentMatch}
                          size="small"
                          color="primary"
                          variant="outlined"
                              sx={{
                                fontWeight: 600,
                                maxWidth: '60%',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                              }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => handleViewCurrentMatch(server, event)}
                          disabled={loadingMatchServerId === server.id}
                        >
                          {loadingMatchServerId === server.id
                            ? t('serversPage.currentMatch.loading')
                            : t('serversPage.currentMatch.view')}
                        </Button>
                          </Box>
                        )}
                        {(server as Server & { queuedMatch?: string | null }).queuedMatch && (
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Chip
                              label={`${t('serversPage.currentMatch.queuedPrefix')}${
                                (server as Server & { queuedMatch?: string | null }).queuedMatch
                              }`}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{
                                fontWeight: 600,
                                maxWidth: '100%',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    )}

                    <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                      {t('serversPage.labels.id')} {server.id}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
                );
              })}
            </Grid>
          </>
        )}

      <ServerModal
        open={modalOpen}
        server={editingServer}
        servers={servers}
        onClose={handleCloseModal}
        onSave={handleSave}
      />

      <BatchServerModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSave={handleSave}
        existingServers={servers}
      />

      {selectedMatch && (
        <MatchDetailsModal
          match={selectedMatch}
          matchNumber={selectedMatch.matchNumber || selectedMatch.id}
          roundLabel={getRoundLabel(selectedMatch.round)}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <ConfirmDialog
        open={selectionMode && bulkDeleteConfirmOpen}
        title={t('serversPage.bulkDelete.title')}
        message={t('serversPage.bulkDelete.message', {
          count: selectedServerIds.size,
          suffix: selectedServerIds.size === 1 ? '' : 's',
        })}
        confirmColor="error"
        onConfirm={async () => {
          if (selectedServerIds.size === 0) {
            setBulkDeleteConfirmOpen(false);
            return;
          }
          try {
            await api.post('/api/servers/bulk-delete', {
              ids: Array.from(selectedServerIds),
            });
            setSelectedServerIds(() => new Set());
            setSelectionMode(false);
            await loadServers();
            await loadAllocationStatus();
          } catch (err) {
            console.error('Failed to delete servers', err);
            showError(t('serversPage.errors.bulkDelete'));
          } finally {
            setBulkDeleteConfirmOpen(false);
          }
        }}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </Box>
  );
}
