# RLCA specification authority

Apply specifications in this order:

1. `RLCA_MASTER_IMPLEMENTATION_SPEC_V5.md` — current build/repair, visual, portal, Coach, Discord, security, and acceptance contract.
2. `RLCA_MASTER_PRODUCT_AND_DISCORD_SPEC_V4_TOP_TIER.md` — prior top-tier detail only where V5 does not supersede it.
3. `RLCA_MASTER_PRODUCT_AND_DISCORD_SPEC_FINAL.md` — prior final contract only where newer contracts do not supersede it.
4. `RLCA_MASTER_BUILD_SPEC.md` — prior V2 detail only where newer contracts do not supersede it.
5. `RLCA_DISCORD_ROLES_PORTALS_SPEC.md` — prior authorization detail only where newer contracts do not supersede it.
6. `OPEN_RULE_DECISIONS.md` — unresolved details only; it cannot override an authoritative specification.

V5 is authoritative over older prompts, mockups, demo records, and previous implementations. Discord, portals, and public pages must call the same backend rules engine and relational source of truth rather than implement repeated prose independently.
