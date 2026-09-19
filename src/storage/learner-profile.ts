import {
  createLearnerProfile,
  learnerProfileSchema,
  type LearnerProfile,
} from "../domain/learner-profile";

export const LEARNER_PROFILE_KEY = "lernraum:personal:profile:v1";
const CHANGE_EVENT = "lernraum-profile-change";
type ProfileStorage = Pick<Storage, "getItem" | "setItem">;

export function createLearnerProfileRepository(
  getStorage: () => ProfileStorage = () => window.localStorage,
) {
  let fallback: LearnerProfile | null = null;
  function read(): LearnerProfile | null {
    try {
      const parsed = learnerProfileSchema.safeParse(
        JSON.parse(getStorage().getItem(LEARNER_PROFILE_KEY) ?? "null"),
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return fallback;
    }
  }
  function notify() {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  function save(profile: LearnerProfile) {
    const checked = learnerProfileSchema.parse(profile);
    getStorage().setItem(LEARNER_PROFILE_KEY, JSON.stringify(checked));
    fallback = checked;
    notify();
  }
  return {
    read,
    save,
    snapshot: () => {
      const profile = read();
      return profile ? JSON.stringify(profile) : null;
    },
    ensure: () => {
      const existing = read() ?? fallback;
      if (existing) return existing;
      const profile = createLearnerProfile();
      try {
        save(profile);
      } catch {
        fallback = profile;
        notify();
      }
      return profile;
    },
    subscribe: (listener: () => void) => {
      window.addEventListener("storage", listener);
      window.addEventListener(CHANGE_EVENT, listener);
      return () => {
        window.removeEventListener("storage", listener);
        window.removeEventListener(CHANGE_EVENT, listener);
      };
    },
  };
}

export const learnerProfileRepository = createLearnerProfileRepository();
