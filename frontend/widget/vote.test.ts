import { describe, expect, it } from "vitest";
import { type Reactions, applyVote, voteMethod } from "./vote.ts";

const r = (up: number, down: number, user_vote: Reactions["user_vote"]): Reactions => ({
  up,
  down,
  score: up - down,
  user_vote,
});

describe("applyVote", () => {
  it("casts an upvote from neutral", () => {
    expect(applyVote(r(0, 0, null), "up")).toEqual({ up: 1, down: 0, score: 1, user_vote: "up" });
  });

  it("casts a downvote from neutral", () => {
    expect(applyVote(r(2, 0, null), "down")).toEqual({
      up: 2,
      down: 1,
      score: 1,
      user_vote: "down",
    });
  });

  it("toggles an active upvote off", () => {
    expect(applyVote(r(1, 0, "up"), "up")).toEqual({ up: 0, down: 0, score: 0, user_vote: null });
  });

  it("switches from up to down (clears the opposite)", () => {
    expect(applyVote(r(3, 1, "up"), "down")).toEqual({
      up: 2,
      down: 2,
      score: 0,
      user_vote: "down",
    });
  });

  it("switches from down to up", () => {
    expect(applyVote(r(2, 2, "down"), "up")).toEqual({
      up: 3,
      down: 1,
      score: 2,
      user_vote: "up",
    });
  });
});

describe("voteMethod", () => {
  it("DELETEs when toggling the active vote", () => {
    expect(voteMethod(r(1, 0, "up"), "up")).toBe("DELETE");
  });

  it("POSTs when casting or switching", () => {
    expect(voteMethod(r(0, 0, null), "up")).toBe("POST");
    expect(voteMethod(r(1, 0, "up"), "down")).toBe("POST");
  });
});
