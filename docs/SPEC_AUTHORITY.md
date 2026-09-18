# RLCA specification authority

Apply specifications in this order:

1. `RLCA_MASTER_BUILD_SPEC.md` — V2 top-level competitive rules and formulas.
2. `RLCA_DISCORD_ROLES_PORTALS_SPEC.md` — authoritative Discord role IDs, role-to-portal authorization, and Discord automation behavior.
3. `OPEN_RULE_DECISIONS.md` — unresolved details only; it cannot override either authoritative specification.

The Discord roles specification contains repeated league context for implementation convenience. Where that repeated context conflicts with V2 competitive rules—including Last Chance or Championship bracket paths—V2 controls. Discord, portals, and public pages must call the same V2 backend rules engine rather than implement the repeated prose independently.
