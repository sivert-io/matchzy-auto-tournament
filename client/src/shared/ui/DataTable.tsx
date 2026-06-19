import { ReactNode } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { GlassCard } from './GlassCard';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  /** Shown (inside the card) when there are no rows. */
  empty?: ReactNode;
  /** Optional per-row click handler. */
  onRowClick?: (row: T) => void;
}

/**
 * Thin, typed wrapper over MUI Table on a glass surface, with a built-in
 * empty state. Columns are declared as data so screens stay declarative.
 */
export function DataTable<T>({ columns, rows, getRowKey, empty, onRowClick }: DataTableProps<T>) {
  return (
    <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align}
                  sx={{ width: col.width, fontWeight: 700, color: 'text.secondary', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ border: 0 }}>
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>{empty ?? '—'}</Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  hover={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align}
                      sx={{ borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </GlassCard>
  );
}

export default DataTable;
