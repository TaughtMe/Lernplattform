// Timing constants for connection-independent online detection (DB heartbeat,
// see supabase/migrations/20260728120000_participant_heartbeat.sql).
//
// The student client reports "still here" every HEARTBEAT_INTERVAL_MS
// (room_participants.last_seen_at). The teacher dashboard counts a
// participant online while their last_seen_at is younger than
// ONLINE_THRESHOLD_MS. The threshold MUST be a multiple of the interval so a
// single missed heartbeat (a brief classroom Wi-Fi drop) doesn't gray them
// out wrongly.
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const ONLINE_THRESHOLD_MS = 45_000;

// How often the dashboard polls the participant list independent of presence,
// so the "N connected" indicator never lags by more than a few seconds even
// if a presence event is missed.
export const PARTICIPANTS_POLL_MS = 8_000;
