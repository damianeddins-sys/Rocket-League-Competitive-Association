# Season 1 rules requiring an owner decision

These details are not fully defined by the master specification. They must be resolved in a published, versioned `season_rulesets` record before affected results are made official.

1. **Major tied-round placement:** Decide how teams eliminated in the same Major round receive distinct placement points. Recommended default: higher incoming seed receives the higher placement.
2. **Multi-team tiebreakers:** Define head-to-head calculation for circles of three or more tied teams and the operational trigger for a deterministic tiebreaker BO5.
3. **Between-game substitutes and MMR:** Define whether expectation is recalculated per game lineup or fixed from the series starters, and how the series delta is shared among participants.
4. **Last Chance second-round paths:** V2 gives Seeds #5 and #6 byes but does not state which first-round winner each receives. The deterministic technical default is #5 vs winner of #3/#8 and #6 vs winner of #4/#7.
5. **Cap rounding boundaries:** Confirm behavior when the 3% floor or cap lands exactly halfway between five-point units.
6. **Balanced rematch allocation:** Define the canonical tie-break when several rematch allocations have equal balance scores. The foundation uses a deterministic schedule order.
7. **Event lock timing:** Publish exact Major 1 and Major 2 lock start/end timestamps and the governing timezone.
8. **Post-start bracket corrections:** Define which competitive circumstances permit a seed correction after play begins and who must approve it.
9. **Unrestricted Free Agent state:** The Discord specification defines an Unrestricted Free Agent role, but the V2 lifecycle defines only `FREE_AGENT`. Decide the official lifecycle transition that distinguishes unrestricted players before status-role synchronization is enabled.
10. **Sign-Up Manager role:** V2 defines an application role without a dedicated Discord role ID. Confirm whether access requires Roster Administrator, a named administration-team role, or both.

No staff UI should imply that these policies are settled merely because a technical default exists. Once approved, each rule must include its effective timestamp and ruleset version so historical calculations remain reproducible.
