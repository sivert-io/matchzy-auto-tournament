import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import Stack from '@mui/material/Stack';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../utils/api';
import { GlassCard, PageShell, pageWidth, publicPageShellSx } from '../../../shared/ui';

interface TeamRow {
  id: string;
  name: string;
  tag?: string;
}

export default function TeamsBrowsePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = `Fragbase — ${t('publicBrowse.teamsTitle')}`;
  }, [t]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<{ success: boolean; teams?: TeamRow[]; error?: string }>(
          '/api/public/teams'
        );
        if (!res.success || !Array.isArray(res.teams)) {
          throw new Error(res.error || 'Failed to load teams');
        }
        setTeams(res.teams);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('publicBrowse.loadError'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(q) ||
        team.id.toLowerCase().includes(q) ||
        (team.tag && team.tag.toLowerCase().includes(q))
    );
  }, [teams, query]);

  return (
    <PageShell maxWidth={pageWidth.default} sx={publicPageShellSx}>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Typography variant="h3" fontWeight={800}>{t('publicBrowse.teamsTitle')}</Typography>
        <Typography color="text.secondary">{t('publicBrowse.teamsSubtitle')}</Typography>
      </Stack>

      <TextField
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('publicBrowse.teamsSearchPlaceholder')}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <GlassCard sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </GlassCard>
      )}

      {!loading && !error && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          }}
        >
          {filtered.map((team) => (
            <GlassCard
              key={team.id}
              component={RouterLink}
              to={`/teams/${team.id}`}
              interactive
              sx={{ p: 2.5, textDecoration: 'none', color: 'inherit' }}
            >
              <Typography fontWeight={700}>{team.name}</Typography>
              {team.tag && (
                <Typography variant="caption" color="text.secondary">[{team.tag}]</Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {team.id}
              </Typography>
            </GlassCard>
          ))}
          {filtered.length === 0 && (
            <GlassCard sx={{ p: 3, gridColumn: '1 / -1' }}>
              <Typography color="text.secondary">{t('publicBrowse.noTeams')}</Typography>
            </GlassCard>
          )}
        </Box>
      )}
    </PageShell>
  );
}
