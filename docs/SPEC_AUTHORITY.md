# RLCA specification authority

Apply specifications in this order:

1. `TIER_SYSTEM.md` — current four-tier IDs, hierarchy, colors, season isolation, and promotion order.
2. `RLCA_MASTER_IMPLEMENTATION_SPEC_V5.md` — current build/repair, visual, portal, Coach, Discord, security, and acceptance contract.
3. `RLCA_MASTER_PRODUCT_AND_DISCORD_SPEC_V4_TOP_TIER.md` — prior top-tier detail only where newer requirements do not supersede it.
4. `RLCA_MASTER_PRODUCT_AND_DISCORD_SPEC_FINAL.md` — prior final contract only where newer contracts do not supersede it.
5. `RLCA_MASTER_BUILD_SPEC.md` — prior V2 detail only where newer contracts do not supersede it.
6. `RLCA_DISCORD_ROLES_PORTALS_SPEC.md` — prior authorization detail only where newer contracts do not supersede it.
7. `OPEN_RULE_DECISIONS.md` — unresolved details only; it cannot override an authoritative specification.

The tier amendment supersedes every older three-tier or conflicting hierarchy reference. The active competitive order is Contender → Challenger → Master → Premier. Discord, portals, and public pages must call the same backend rules engine and relational source of truth rather than implement repeated prose independently.
