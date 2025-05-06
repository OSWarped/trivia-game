/* eslint-disable no-var */
// types/global.d.ts
export {};

interface TeamData {
  id: string;
  name: string;
}

declare global {
    var activeTeamsByGame: Map<string, Map<string, { id: string; name: string }>>;
  }
