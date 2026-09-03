// Base URL of the leaderboard/PvP server. Empty = offline (the net client then
// never calls fetch). Set by the deploy task (T44) to the Render service URL;
// `DESMON_SERVER_URL` overrides it at runtime (src/main/ipc.ts).
export const SERVER_URL = 'https://desmon-server.onrender.com';
