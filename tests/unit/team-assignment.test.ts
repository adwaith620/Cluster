import { describe, it, expect } from 'vitest';
import {
  assignBalancedTeams,
  calculateOtherMembersCount,
  shuffleArray,
} from '@/lib/algorithms/team-assignment';

describe('Team Assignment Algorithm', () => {
  it('throws error if team count < 2', () => {
    const participants = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
    expect(() => assignBalancedTeams(participants, 1)).toThrow('Team count must be at least 2');
    expect(() => assignBalancedTeams(participants, 0)).toThrow('Team count must be at least 2');
    expect(() => assignBalancedTeams(participants, -1)).toThrow('Team count must be at least 2');
  });

  it('throws error if participants count is 0', () => {
    expect(() => assignBalancedTeams([], 2)).toThrow('Cannot assign teams with 0 participants');
  });

  it('throws error if team count exceeds participant count', () => {
    const participants = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ];
    expect(() => assignBalancedTeams(participants, 3)).toThrow(
      'Cannot create 3 teams with only 2 participants'
    );
  });

  it('balances perfectly divisible participants (e.g. 10 participants, 2 teams)', () => {
    const participants = Array.from({ length: 10 }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Person ${i + 1}`,
    }));

    const result = assignBalancedTeams(participants, 2);
    expect(result.teams).toHaveLength(2);
    expect(result.teams[0].size).toBe(5);
    expect(result.teams[1].size).toBe(5);
    expect(result.baseTeamSize).toBe(5);
    expect(result.largerTeamsCount).toBe(0);
  });

  it('balances with remainder according to mathematical formula (e.g. 77 participants, 8 teams)', () => {
    // 77 / 8 = 9 remainder 5. Five teams of 10, three teams of 9.
    const participants = Array.from({ length: 77 }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Person ${i + 1}`,
    }));

    const result = assignBalancedTeams(participants, 8);
    expect(result.teams).toHaveLength(8);
    expect(result.baseTeamSize).toBe(9);
    expect(result.largerTeamsCount).toBe(5);

    const teamSizes = result.teams.map((t) => t.size);
    const countTen = teamSizes.filter((s) => s === 10).length;
    const countNine = teamSizes.filter((s) => s === 9).length;

    expect(countTen).toBe(5);
    expect(countNine).toBe(3);

    // Difference between max and min team size is at most 1
    const minSize = Math.min(...teamSizes);
    const maxSize = Math.max(...teamSizes);
    expect(maxSize - minSize).toBeLessThanOrEqual(1);

    // Verify all 77 unique participants are assigned exactly once
    const assignedIds = new Set(result.teams.flatMap((t) => t.members.map((m) => m.id)));
    expect(assignedIds.size).toBe(77);
  });

  it('handles edge case: participants equal to teams (e.g. 5 participants, 5 teams)', () => {
    const participants = Array.from({ length: 5 }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Person ${i + 1}`,
    }));

    const result = assignBalancedTeams(participants, 5);
    expect(result.teams).toHaveLength(5);
    result.teams.forEach((t) => {
      expect(t.size).toBe(1);
    });
  });

  it('guarantees max size difference <= 1 across 100 random sizes', () => {
    for (let run = 0; run < 100; run++) {
      const n = Math.floor(Math.random() * 99) + 2; // 2 to 100
      const k = Math.floor(Math.random() * (n - 2 + 1)) + 2; // 2 to n

      const participants = Array.from({ length: n }, (_, i) => ({
        id: `p-${i}`,
        name: `Name ${i}`,
      }));

      const result = assignBalancedTeams(participants, k);
      const sizes = result.teams.map((t) => t.size);
      const min = Math.min(...sizes);
      const max = Math.max(...sizes);

      expect(max - min).toBeLessThanOrEqual(1);
      const totalAssigned = sizes.reduce((a, b) => a + b, 0);
      expect(totalAssigned).toBe(n);
    }
  });

  it('shuffles participants rather than preserving index order', () => {
    const participants = Array.from({ length: 50 }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Person ${i + 1}`,
    }));

    const result = assignBalancedTeams(participants, 5);
    const firstTeamIds = result.teams[0].members.map((m) => m.id);
    const expectedSequentialFirstTeam = ['p-1', 'p-6', 'p-11', 'p-16', 'p-21', 'p-26', 'p-31', 'p-36', 'p-41', 'p-46'];

    // Fisher-Yates with random seed will almost never equal strict sequential mod index
    expect(firstTeamIds).not.toEqual(expectedSequentialFirstTeam);
  });
});

describe('Other Members Count Calculation', () => {
  it('correctly subtracts self from team size', () => {
    expect(calculateOtherMembersCount(6)).toBe(5);
    expect(calculateOtherMembersCount(10)).toBe(9);
    expect(calculateOtherMembersCount(1)).toBe(0);
    expect(calculateOtherMembersCount(0)).toBe(0);
  });
});
