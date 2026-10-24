import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignBalancedTeams, calculateOtherMembersCount } from '@/lib/algorithms/team-assignment';
import { generateParticipantsCsv } from '@/lib/utils/csv';
import { generateJoinCode } from '@/lib/utils/code';
import { getSessionJoinUrl } from '@/lib/utils/qr';
import { checkRateLimit } from '@/lib/utils/rate-limit';

describe('Integration: Session Lifecycle & Concurrency Simulation', () => {
  interface SimulatedParticipant {
    id: string;
    name: string;
    deviceToken: string;
    status: 'active' | 'cancelled';
    lastHeartbeatAt: number;
    teamId: string | null;
  }

  interface SimulatedSession {
    id: string;
    title: string;
    capacity: number;
    status: 'draft' | 'registration_open' | 'registration_locked' | 'assigned' | 'revealed' | 'completed';
    isArchived: boolean;
    participants: SimulatedParticipant[];
  }

  let session: SimulatedSession;

  beforeEach(() => {
    session = {
      id: 'session-test-uuid',
      title: 'Orientation Icebreaker',
      capacity: 5, // small capacity for concurrency testing
      status: 'registration_open',
      isArchived: false,
      participants: [],
    };
  });

  // Emulates the atomic Postgres RPC logic of register_participant
  function atomicRegister(joinCode: string, name: string, deviceToken: string) {
    if (session.isArchived) {
      throw new Error('SESSION_ARCHIVED');
    }
    if (session.status !== 'registration_open') {
      throw new Error(`REGISTRATION_CLOSED: Registration is ${session.status}`);
    }

    // Existing participant check (idempotency / resume)
    const existing = session.participants.find((p) => p.deviceToken === deviceToken);
    if (existing) {
      if (existing.status === 'active') {
        existing.lastHeartbeatAt = Date.now();
        existing.name = name.trim();
        return {
          resumed: true,
          participantId: existing.id,
          activeCount: session.participants.filter((p) => p.status === 'active').length,
        };
      } else {
        // Was cancelled: check capacity to reactivate
        const activeCount = session.participants.filter((p) => p.status === 'active').length;
        if (activeCount >= session.capacity) {
          throw new Error('CAPACITY_REACHED');
        }
        existing.status = 'active';
        existing.name = name.trim();
        existing.lastHeartbeatAt = Date.now();
        return {
          resumed: true,
          participantId: existing.id,
          activeCount: activeCount + 1,
        };
      }
    }

    // New participant
    const activeCount = session.participants.filter((p) => p.status === 'active').length;
    if (activeCount >= session.capacity) {
      throw new Error('CAPACITY_REACHED');
    }

    const newP: SimulatedParticipant = {
      id: `p-${session.participants.length + 1}`,
      name: name.trim(),
      deviceToken,
      status: 'active',
      lastHeartbeatAt: Date.now(),
      teamId: null,
    };
    session.participants.push(newP);

    return {
      resumed: false,
      participantId: newP.id,
      activeCount: activeCount + 1,
    };
  }

  // Emulates clean_inactive_participants
  function cleanInactive(graceMs: number) {
    if (session.status !== 'registration_open') return 0;
    const now = Date.now();
    let cleaned = 0;
    for (const p of session.participants) {
      if (p.status === 'active' && now - p.lastHeartbeatAt > graceMs) {
        p.status = 'cancelled';
        cleaned++;
      }
    }
    return cleaned;
  }

  it('allows registration when session is open and under capacity', () => {
    const res = atomicRegister('TEST01', 'Alice', 'dev-token-alice');
    expect(res.resumed).toBe(false);
    expect(res.activeCount).toBe(1);
    expect(session.participants).toHaveLength(1);
  });

  it('rejects registration when session status is not registration_open', () => {
    session.status = 'registration_locked';
    expect(() => atomicRegister('TEST01', 'Bob', 'dev-token-bob')).toThrow('REGISTRATION_CLOSED');

    session.status = 'draft';
    expect(() => atomicRegister('TEST01', 'Bob', 'dev-token-bob')).toThrow('REGISTRATION_CLOSED');
  });

  it('enforces capacity limit strictly', () => {
    // Fill up to capacity (5)
    for (let i = 1; i <= 5; i++) {
      atomicRegister('TEST01', `Person ${i}`, `token-${i}`);
    }
    expect(session.participants.filter((p) => p.status === 'active')).toHaveLength(5);

    // 6th attempt must fail with CAPACITY_REACHED
    expect(() => atomicRegister('TEST01', 'Person 6', 'token-6')).toThrow('CAPACITY_REACHED');
  });

  it('simulates competing concurrent requests for the final available slot', async () => {
    // 4 participants register first
    for (let i = 1; i <= 4; i++) {
      atomicRegister('TEST01', `Person ${i}`, `token-${i}`);
    }
    expect(session.participants.filter((p) => p.status === 'active')).toHaveLength(4);

    // Now 10 simulated participants simultaneously compete for the 5th (and final) slot
    const competitors = Array.from({ length: 10 }, (_, i) => ({
      name: `Competitor ${i + 1}`,
      token: `comp-token-${i + 1}`,
    }));

    const results: { success: boolean; error?: string }[] = [];

    // Simulate atomic serialized transactions
    for (const comp of competitors) {
      try {
        atomicRegister('TEST01', comp.name, comp.token);
        results.push({ success: true });
      } catch (err: any) {
        results.push({ success: false, error: err.message });
      }
    }

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Exactly ONE competitor succeeds; the other 9 receive CAPACITY_REACHED
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);
    failures.forEach((f) => expect(f.error).toBe('CAPACITY_REACHED'));
    expect(session.participants.filter((p) => p.status === 'active')).toHaveLength(5);
  });

  it('is idempotent on duplicate submissions with the same device token', () => {
    const res1 = atomicRegister('TEST01', 'Alex', 'alex-device-token');
    expect(res1.resumed).toBe(false);
    expect(res1.activeCount).toBe(1);

    // Immediate retry with same token
    const res2 = atomicRegister('TEST01', 'Alex', 'alex-device-token');
    expect(res2.resumed).toBe(true);
    expect(res2.activeCount).toBe(1);
    expect(session.participants).toHaveLength(1);
  });

  it('expires inactive participants after the grace period and frees capacity', () => {
    atomicRegister('TEST01', 'Active User', 'token-active');
    atomicRegister('TEST01', 'Inactive User', 'token-inactive');

    expect(session.participants.filter((p) => p.status === 'active')).toHaveLength(2);

    // Fast-forward time for inactive user
    const inactiveP = session.participants.find((p) => p.deviceToken === 'token-inactive')!;
    inactiveP.lastHeartbeatAt = Date.now() - 200000; // > 3 minutes ago

    const cleaned = cleanInactive(180000);
    expect(cleaned).toBe(1);
    expect(inactiveP.status).toBe('cancelled');
    expect(session.participants.filter((p) => p.status === 'active')).toHaveLength(1);
  });

  it('does not clean inactive participants once registration is locked or revealed', () => {
    atomicRegister('TEST01', 'User 1', 'token-1');
    const p1 = session.participants[0];
    p1.lastHeartbeatAt = Date.now() - 300000;

    session.status = 'revealed';
    const cleaned = cleanInactive(180000);
    expect(cleaned).toBe(0);
    expect(p1.status).toBe('active');
  });

  it('does not leak assignments before reveal state', () => {
    // Fill 6 participants and assign 2 teams
    session.capacity = 10;
    for (let i = 1; i <= 6; i++) {
      atomicRegister('TEST01', `Participant ${i}`, `token-${i}`);
    }

    session.status = 'registration_locked';
    const active = session.participants.filter((p) => p.status === 'active');
    const assignment = assignBalancedTeams(active, 2);

    session.status = 'assigned';

    // Simulate get_participant_reveal_data security invariant
    function getRevealData(pToken: string) {
      const p = session.participants.find((x) => x.deviceToken === pToken);
      if (!p) throw new Error('NOT_FOUND');

      if (session.status !== 'revealed' && session.status !== 'completed') {
        return {
          revealed: false,
          sessionStatus: session.status,
          participantName: p.name,
        };
      }

      const teamNumber = assignment.participantToTeamMap.get(p.id)!;
      const team = assignment.teams.find((t) => t.teamNumber === teamNumber)!;
      return {
        revealed: true,
        sessionStatus: session.status,
        teamName: `Team ${teamNumber}`,
        mediaUrl: `https://storage.example.com/team_${teamNumber}.png`,
        otherMembersCount: calculateOtherMembersCount(team.size),
      };
    }

    // While status is 'assigned', participant MUST NOT see team info
    const preReveal = getRevealData('token-1');
    expect(preReveal.revealed).toBe(false);
    expect((preReveal as any).mediaUrl).toBeUndefined();
    expect((preReveal as any).teamName).toBeUndefined();

    // Reveal session
    session.status = 'revealed';
    const postReveal = getRevealData('token-1');
    expect(postReveal.revealed).toBe(true);
    expect(postReveal.teamName).toBeDefined();
    expect(postReveal.mediaUrl).toBeDefined();
    expect(postReveal.otherMembersCount).toBe(2); // 3 members total on team of 6 / 2
  });
});

describe('CSV Export & URL Generation Utilities', () => {
  it('correctly escapes CSV special characters (quotes, commas, newlines)', () => {
    const csv = generateParticipantsCsv([
      {
        participantName: 'Miller, John "The Rock"',
        status: 'active',
        teamNumber: 1,
        teamName: 'Team "Alpha"',
        joinedAt: '2026-10-24T12:00:00Z',
      },
      {
        participantName: 'Standard Name',
        status: 'active',
        teamNumber: 2,
        teamName: 'Team Beta',
        joinedAt: '2026-10-24T12:05:00Z',
      },
    ]);

    expect(csv).toContain('"Miller, John ""The Rock"""');
    expect(csv).toContain('"Team ""Alpha"""');
    expect(csv).toContain('"Standard Name"');
  });

  it('generates canonical join URLs with normalized join codes', () => {
    const url = getSessionJoinUrl('abc123');
    expect(url).toContain('/join/ABC123');
  });

  it('generates random alphanumeric join codes without ambiguous characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode(6);
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
      expect(code).not.toContain('0');
      expect(code).not.toContain('O');
      expect(code).not.toContain('1');
      expect(code).not.toContain('I');
    }
  });

  it('rate limits excessive requests properly', () => {
    const ip = '192.168.1.100';
    for (let i = 0; i < 5; i++) {
      const check = checkRateLimit(`test-ip:${ip}`, 5, 10000);
      expect(check.allowed).toBe(true);
    }
    // 6th request must be disallowed
    const blocked = checkRateLimit(`test-ip:${ip}`, 5, 10000);
    expect(blocked.allowed).toBe(false);
  });
});
