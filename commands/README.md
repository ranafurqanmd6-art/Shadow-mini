# commands/

Put **all** command files directly in this folder (no sub-folders needed). Every `.js` file here is
loaded at start-up, registered with the handler and listed in the menu under its `category`.

* One file can export one command (like `ping.js`) or an array of commands (like `fun.js`).
* Files starting with `_` are ignored (see `_template.js`).
* Duplicate command names/aliases are rejected with a warning in the log.
* A broken file is skipped; it never stops the bot from starting.
* Optional commands can define `available()`; the menu hides them while it returns false
  (the AI commands use this until an API key is set).

Extra options: `superOwnerOnly`, `needsGroupMeta`, `cooldown` (seconds).
