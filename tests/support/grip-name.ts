// Plain, so a Playwright spec can import it without pulling in Vitest.

/** A drag handle is named "Move <item>"; this matches it and not the Move Up and Move Down buttons beside it. */
export const GRIP_NAME = /^Move (?!Up |Down )/;
