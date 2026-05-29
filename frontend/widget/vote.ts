// Pure vote-state logic, kept out of main.ts so the toggle/switch edge cases are
// unit-testable. up/down are mutually exclusive; clicking your active vote clears
// it. Mirrors the server's mutual-exclusivity in reactions.ts so the optimistic UI
// matches what a refetch would return.

export type Vote = "up" | "down" | null;

export interface Reactions {
  up: number;
  down: number;
  score: number;
  user_vote: Vote;
}

// The HTTP call the click implies: DELETE when toggling the active vote off, POST
// otherwise (the POST clears the opposite vote server-side).
export function voteMethod(r: Reactions, kind: "up" | "down"): "POST" | "DELETE" {
  return r.user_vote === kind ? "DELETE" : "POST";
}

export function applyVote(r: Reactions, kind: "up" | "down"): Reactions {
  let up = r.up - (r.user_vote === "up" ? 1 : 0);
  let down = r.down - (r.user_vote === "down" ? 1 : 0);
  let user_vote: Vote = null;

  if (r.user_vote !== kind) {
    if (kind === "up") up += 1;
    else down += 1;
    user_vote = kind;
  }

  return { up, down, score: up - down, user_vote };
}
