import { afterEach, expect, it, vi } from "vitest";
import { createLearnerProfile } from "../domain/learner-profile";
import {
  createLearnerProfileRepository,
  LEARNER_PROFILE_KEY,
} from "./learner-profile";

afterEach(() => localStorage.clear());
it("persists the selection across repository instances and notifies the UI", () => {
  const repo = createLearnerProfileRepository();
  const listener = vi.fn();
  const unsubscribe = repo.subscribe(listener);
  expect(repo.snapshot()).toBeNull();
  const selected = createLearnerProfile("Fuchs");
  repo.save(selected);
  expect(listener).toHaveBeenCalledOnce();
  expect(createLearnerProfileRepository().ensure()).toEqual(selected);
  expect(JSON.parse(repo.snapshot()!)).toEqual(selected);
  unsubscribe();
  repo.save(createLearnerProfile("Katze"));
  expect(listener).toHaveBeenCalledOnce();
});
it("repairs corrupt data and keeps the unselected animal null", () => {
  const repo = createLearnerProfileRepository();
  localStorage.setItem(LEARNER_PROFILE_KEY, "broken");
  expect(repo.read()).toBeNull();
  const first = repo.ensure();
  expect(first.animal).toBeNull();
  expect(repo.ensure()).toEqual(first);
  localStorage.setItem(LEARNER_PROFILE_KEY, '{"animal":"unknown"}');
  expect(repo.read()).toBeNull();
});
it("allows joining with a stable fallback when storage is blocked but reports save errors", () => {
  const repo = createLearnerProfileRepository(() => {
    throw new Error("blocked");
  });
  expect(repo.read()).toBeNull();
  const first = repo.ensure();
  expect(repo.read()).toEqual(first);
  expect(repo.ensure()).toEqual(first);
  expect(() => repo.save(createLearnerProfile("Katze"))).toThrow("blocked");
});
