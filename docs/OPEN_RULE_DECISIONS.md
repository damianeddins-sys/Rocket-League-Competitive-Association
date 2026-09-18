# Season 1 rules requiring an owner decision

These details are not fully defined by the master specification. They must be resolved in a published, versioned `season_rulesets` record before affected results are made official.

1. **Major tied-round placement:** Decide how teams eliminated in the same Major round receive distinct placement points. Recommended default: higher incoming seed receives the higher placement.
2. **Multi-team tiebreakers:** Define head-to-head calculation for circles of three or more tied teams and the operational trigger for a deterministic tiebreaker BO5.
3. **Between-game substitutes and MMR:** Define whether expectation is recalculated per game lineup or fixed from the series starters, and how the series delta is shared among participants.
4. **P20 calculation:** Confirm percentile interpolation. The foundation currently uses linear interpolation over accepted checkpoints.
5. **Combine normalization:** Choose min-max, z-score, or percentile normalization and define outlier handling. The foundation currently uses min-max normalization.
6. **Cap rounding boundaries:** Confirm behavior when the 3% floor or cap lands exactly halfway between five-point units.
7. **Balanced rematch allocation:** Define the canonical tie-break when several rematch allocations have equal balance scores. The foundation uses a deterministic schedule order.
8. **Event lock timing:** Publish exact Major 1 and Major 2 lock start/end timestamps and the governing timezone.
9. **Post-start bracket corrections:** Define which competitive circumstances permit a seed correction after play begins and who must approve it.

No staff UI should imply that these policies are settled merely because a technical default exists. Once approved, each rule must include its effective timestamp and ruleset version so historical calculations remain reproducible.
