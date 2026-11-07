# Emberbrook project instructions

- Keep README.md and the relevant design notes current when player behavior, controls, or assets change.
- Preserve the existing calculus draft and active combat behavior unless the task explicitly changes the mechanic.
- Use the project owner's [skill collection](https://github.com/klein-sys/own-flasher/tree/main/.agents/skills). Read [diagnosing-bugs](https://github.com/klein-sys/own-flasher/blob/main/.agents/skills/diagnosing-bugs/SKILL.md) for reproducible gameplay and viewport bugs, [codebase-design](https://github.com/klein-sys/own-flasher/blob/main/.agents/skills/codebase-design/SKILL.md) when changes span world, input, or rendering, and [code-review](https://github.com/klein-sys/own-flasher/blob/main/.agents/skills/code-review/SKILL.md) for the final standards and spec pass.
- Run node --test tests/game.test.cjs and verify changed player flows in a browser at desktop and touch sizes. Record the source and terms for any newly shipped pack assets.
