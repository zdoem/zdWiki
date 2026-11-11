# Loop Engineering & The Learn Stage

## The 10-Stage Engineering Loop

Every task in zdWiki proceeds through the canonical workflow:

```text
Goal → Context → Plan → Implement → Test → Pass? → (No: Diagnose → Fix → Retest) → (Yes: Verify → Learn → Stop)
```

1. **Goal**: Explicit problem statement, scope boundaries, and acceptance criteria.
2. **Context**: Relevant code paths, existing tests, and constraints.
3. **Plan**: Architecture design and test specifications before modifying code.
4. **Implement**: Minimal, focused code changes according to project conventions.
5. **Test**: Run targeted and full regression test suites.
6. **Diagnose**: (If test fails) Observe failure logs, collect evidence, form hypothesis.
7. **Fix**: Apply the smallest necessary fix addressing the root cause.
8. **Retest**: Run the failing test to prove resolution, then run the full regression suite.
9. **Verify**: Evidence Gate verifying all acceptance criteria are met.
10. **Learn**: Mandatory step — preserve discoveries as new `bug`, `test`, `debug_playbook`, or `decision` objects in zdWiki.
