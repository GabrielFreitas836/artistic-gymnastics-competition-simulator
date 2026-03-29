import { getCountryById } from "@/lib/countries";
import {
  TeamApparatusEntry,
  TeamApparatusKey,
  TeamApparatusRankingRow,
} from "@/lib/rankings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const APPARATUS_COLUMNS: { key: TeamApparatusKey; label: string }[] = [
  { key: 'VT', label: 'Vault' },
  { key: 'UB', label: 'Bars' },
  { key: 'BB', label: 'Beam' },
  { key: 'FX', label: 'Floor' },
];

interface TeamApparatusRankingProps {
  rows: TeamApparatusRankingRow[];
}

const formatEntry = (entry: TeamApparatusEntry): string =>
  entry.score === null || entry.rank === null
    ? '-'
    : `${entry.score.toFixed(3)}(${entry.rank})`;

export default function TeamApparatusRanking({
  rows,
}: TeamApparatusRankingProps) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 italic">
        No team data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="border-white/10 bg-slate-900/40 hover:bg-slate-900/40">
            <TableHead className="px-4 py-4 font-bold uppercase tracking-widest text-slate-400">
              Team
            </TableHead>
            {APPARATUS_COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className="px-4 py-4 text-right font-bold uppercase tracking-widest text-slate-400"
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const country = getCountryById(row.team.countryId);

            return (
              <TableRow
                key={row.team.countryId}
                className="border-white/5 transition-colors hover:bg-white/5"
              >
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{country.flag}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{country.name}</div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">
                        {row.team.countryId}
                      </div>
                    </div>
                  </div>
                </TableCell>
                {APPARATUS_COLUMNS.map((column) => (
                  <TableCell
                    key={column.key}
                    className="px-4 py-4 text-right font-mono tabular-nums text-slate-200"
                  >
                    {formatEntry(row.apparatus[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
