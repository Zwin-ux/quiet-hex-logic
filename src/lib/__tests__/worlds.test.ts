import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { createWorld, joinWorld, loadWorldOverview } from '../worlds';

describe('world helpers', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  it('uses the atomic create RPC when it is available', async () => {
    const rpcWorld = {
      id: 'world-1',
      slug: 'foundry',
      name: 'Foundry',
      description: 'Host arena',
      visibility: 'public',
      created_by: 'user-1',
      created_at: '2026-04-12T00:00:00.000Z',
      updated_at: '2026-04-12T00:00:00.000Z',
    };

    mockRpc.mockResolvedValueOnce({ data: rpcWorld, error: null });

    const result = await createWorld({
      userId: 'user-1',
      name: 'Foundry',
      description: 'Host arena',
      visibility: 'public',
    });

    expect(result).toEqual(rpcWorld);
    expect(mockRpc).toHaveBeenCalledWith('create_world_atomic', {
      p_name: 'Foundry',
      p_description: 'Host arena',
      p_visibility: 'public',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back to direct inserts when the atomic create RPC is unavailable', async () => {
    const insertedWorld = {
      id: 'world-2',
      slug: 'signal-room',
      name: 'Signal Room',
      description: 'First world',
      visibility: 'private',
      created_by: 'user-2',
      created_at: '2026-04-12T00:00:00.000Z',
      updated_at: '2026-04-12T00:00:00.000Z',
    };

    const worldInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: insertedWorld, error: null }),
      })),
    }));
    const membershipInsert = vi.fn().mockResolvedValue({ error: null });

    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.create_world_atomic' },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'worlds') {
        return { insert: worldInsert };
      }

      if (table === 'world_members') {
        return { insert: membershipInsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await createWorld({
      userId: 'user-2',
      name: 'Signal Room',
      description: 'First world',
      visibility: 'private',
    });

    expect(result).toEqual(insertedWorld);
    expect(worldInsert).toHaveBeenCalledWith({
      name: 'Signal Room',
      slug: 'signal-room',
      description: 'First world',
      visibility: 'private',
      created_by: 'user-2',
    });
    expect(membershipInsert).toHaveBeenCalledWith({
      world_id: 'world-2',
      profile_id: 'user-2',
      role: 'owner',
    });
  });

  it('falls back to direct membership upsert when join RPC is unavailable', async () => {
    const membershipUpsert = vi.fn().mockResolvedValue({ error: null });

    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.join_world_atomic' },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'world_members') {
        return { upsert: membershipUpsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    await joinWorld('world-3', 'user-3');

    expect(mockRpc).toHaveBeenCalledWith('join_world_atomic', {
      p_world_id: 'world-3',
    });
    expect(membershipUpsert).toHaveBeenCalledWith(
      {
        world_id: 'world-3',
        profile_id: 'user-3',
        role: 'member',
      },
      { onConflict: 'world_id,profile_id' },
    );
  });

  it('maps competitive event state into the world overview fallback path', async () => {
    const world = {
      id: 'world-4',
      slug: 'alpha-hall',
      name: 'Alpha Hall',
      description: 'Tournament venue',
      visibility: 'public',
      created_by: 'host-1',
      created_at: '2026-04-12T00:00:00.000Z',
      updated_at: '2026-04-12T00:00:00.000Z',
    };

    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.get_world_overview' },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'worlds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: world, error: null }),
            })),
          })),
        };
      }

      if (table === 'world_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { world_id: 'world-4', profile_id: 'host-1', role: 'owner' },
                { world_id: 'world-4', profile_id: 'user-4', role: 'member' },
              ],
              error: null,
            }),
          })),
        };
      }

      if (table === 'tournaments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'event-1',
                    world_id: 'world-4',
                    name: 'Qualifier',
                    description: 'Verified field',
                    status: 'registration',
                    format: 'single_elimination',
                    competitive_mode: true,
                    max_players: 8,
                    created_at: '2026-04-12T00:00:00.000Z',
                    start_time: null,
                  },
                ],
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === 'lobbies') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'lobby-1',
                      world_id: 'world-4',
                      code: 'ALPHA1',
                      host_id: 'host-1',
                      game_key: 'hex',
                      board_size: 11,
                      pie_rule: true,
                      status: 'waiting',
                      created_at: '2026-04-12T00:00:00.000Z',
                    },
                  ],
                  error: null,
                }),
              })),
            })),
          })),
        };
      }

      if (table === 'matches') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        };
      }

      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: 'host-1', username: 'Host', avatar_color: 'indigo' },
              ],
              error: null,
            }),
          })),
        };
      }

      if (table === 'tournament_participants') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ tournament_id: 'event-1' }, { tournament_id: 'event-1' }],
              error: null,
            }),
          })),
        };
      }

      if (table === 'lobby_players') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ lobby_id: 'lobby-1' }],
              error: null,
            }),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const overview = await loadWorldOverview('world-4', 'host-1');

    expect(overview.world.eventCount).toBe(1);
    expect(overview.world.instanceCount).toBe(1);
    expect(overview.events).toEqual([
      expect.objectContaining({
        id: 'event-1',
        competitiveMode: true,
        participantCount: 2,
      }),
    ]);
    expect(overview.lobbies).toEqual([
      expect.objectContaining({
        id: 'lobby-1',
        playerCount: 1,
      }),
    ]);
  });
});
