# v0.8 agent discussion and decisions

Participants: actual host `/root`, Designer `/root/designer`, Critic `/root/critic`, Balance `/root/balance`. Discussion occurred in three rounds on 2026-09-14, before implementation. It was a host-tool conversation, not a completed v8 artifact audit.

1. Designer proposed copy-only cleanup, a larger/readable menu, and a new home/quest system. Critic challenged permission prompts appearing before explanation, hidden choice/reset details, preferences overwrites, undisplayed discovery ACK and lost save-error notifications.
2. Designer accepted the concrete safeguards; Balance rejected immediate XP/HP/content tuning because first-card/no-management policies confound collection gaps. A paired 2×2 policy study was accepted instead. Existing roster-full behavior is reused: successful capture rolls release bosses at capacity, with one soul per two releases.
3. User explicitly retained the existing pixel UI. Designer withdrew 720px/resizable/sans proposals; Critic accepted 420×640 and compact vertical candidates with wrapping rather than information loss. Both removed unnecessary runtime hook disable/re-enable scope. Host confirmed native mute, existing shake option, save-original protection, and corrected memory metric to workingSetSize.

User decisions: external-test candidate; macOS first; input-driven growth; current pixel style/window; mute and shake controls; retain online functions. New-install default: muted=false, screenShake=true, no global hook until an explicit connection request. Existing recognized saves default to requested global input. Runtime connection starts at most once; skip/window close persists fallback. Settings write failures are shown honestly.

Field/character art and core progression remain unchanged. Menu candidates become three vertical rows with 48px art, name/rarity/type/effect and action. Reset/retention/reward summary remains outside collapsed details. Codex stays two columns and ACK applies only to displayed discoveries. No forced recurring menu opens, new goals, automated disposal or new content.

The final independent Critic accepted online preservation, isolated test-account verification, working-set comparison and blocking corrupted-load gameplay/save/network to preserve the original. Product implementation and real measurements follow this approved discussion; human checks remain pending until observed.
