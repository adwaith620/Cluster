/**
 * Utilities for escaping and generating CSV exports safely.
 */

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // If the cell contains quotes, commas, or newlines, escape quotes by doubling them and enclose in quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export interface ParticipantCsvRow {
  participantName: string;
  status: string;
  teamNumber: number | string;
  teamName: string;
  joinedAt: string;
}

export function generateParticipantsCsv(rows: ParticipantCsvRow[]): string {
  const headers = ['Participant Name', 'Status', 'Team Number', 'Team Name', 'Joined At'];
  const csvLines = [headers.map(escapeCsvCell).join(',')];

  for (const row of rows) {
    csvLines.push(
      [
        row.participantName,
        row.status,
        row.teamNumber,
        row.teamName,
        row.joinedAt,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  return csvLines.join('\r\n');
}
