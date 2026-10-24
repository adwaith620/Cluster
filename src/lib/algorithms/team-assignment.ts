/**
 * Balanced and randomized team assignment algorithm for Cluster.
 *
 * Mathematical invariants:
 * - N = total eligible participants
 * - K = total teams
 * - q = floor(N / K)
 * - r = N % K
 * - Exactly r teams will have (q + 1) members.
 * - Exactly (K - r) teams will have q members.
 * - Maximum team size difference is strictly <= 1.
 */

export interface AssignableParticipant {
  id: string;
  name: string;
}

export interface AssignedTeamGroup<T extends AssignableParticipant = AssignableParticipant> {
  teamNumber: number;
  members: T[];
  size: number;
}

export interface AssignmentResult<T extends AssignableParticipant = AssignableParticipant> {
  teams: AssignedTeamGroup<T>[];
  participantToTeamMap: Map<string, number>;
  totalParticipants: number;
  teamCount: number;
  baseTeamSize: number;
  largerTeamsCount: number;
}

/**
 * Modern Fisher-Yates unbiased shuffle.
 */
export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Assigns participants to K teams in a balanced, randomized manner.
 *
 * @param participants List of active participants
 * @param teamCount Number of teams K (must be >= 2 and <= participants.length)
 * @param rng Optional custom PRNG function for test reproducibility
 */
export function assignBalancedTeams<T extends AssignableParticipant>(
  participants: T[],
  teamCount: number,
  rng: () => number = Math.random
): AssignmentResult<T> {
  const n = participants.length;

  if (teamCount < 2) {
    throw new Error('Team count must be at least 2.');
  }

  if (n === 0) {
    throw new Error('Cannot assign teams with 0 participants.');
  }

  if (teamCount > n) {
    throw new Error(
      `Cannot create ${teamCount} teams with only ${n} participant${n === 1 ? '' : 's'}. Each team must have at least one member.`
    );
  }

  const q = Math.floor(n / teamCount);
  const r = n % teamCount;

  // 1. Unbiased shuffle of all participants
  const shuffled = shuffleArray(participants, rng);

  // 2. Initialize teams 1..K
  const teams: AssignedTeamGroup<T>[] = Array.from({ length: teamCount }, (_, i) => ({
    teamNumber: i + 1,
    members: [],
    size: 0,
  }));

  const participantToTeamMap = new Map<string, number>();

  // 3. Round-robin assignment across shuffled participants
  for (let i = 0; i < shuffled.length; i++) {
    const teamIndex = i % teamCount;
    const participant = shuffled[i];
    teams[teamIndex].members.push(participant);
    teams[teamIndex].size++;
    participantToTeamMap.set(participant.id, teams[teamIndex].teamNumber);
  }

  return {
    teams,
    participantToTeamMap,
    totalParticipants: n,
    teamCount,
    baseTeamSize: q,
    largerTeamsCount: r,
  };
}

/**
 * Computes the number of other members on the same team.
 * For a team with total member count m, other members is m - 1 (excluding self).
 */
export function calculateOtherMembersCount(totalTeamMembers: number): number {
  if (totalTeamMembers <= 0) return 0;
  return Math.max(0, totalTeamMembers - 1);
}
