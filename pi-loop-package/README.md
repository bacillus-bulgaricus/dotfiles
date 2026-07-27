# pi-loop-package

Pi package that repeatedly re-sends a prompt until the agent decides to stop.

## Install

```bash
pi install ./pi-loop-package
```

## Usage

```bash
/loop start Investigate flaky tests and keep iterating until root cause is found --max 20
```

Other commands:

```bash
/loop status
/loop stop
```

## How it stops

During each turn, the agent can call `loop_control`:

- `action: "continue"` to run another iteration
- `action: "stop"` to stop the loop

If the agent does not call `continue`, the loop stops automatically after the agent fully settles. Active loop state is restored when a saved session is resumed or extensions are reloaded.
