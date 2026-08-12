# smartzsh

IDE-style autocomplete for **zsh on macOS**. A terminal-native runtime for
[Fig's autocomplete specs](https://github.com/withfig/autocomplete) (600+ CLIs), personalized from
[microsoft/inshellisense](https://github.com/microsoft/inshellisense) and stripped down to a single
shell + platform.

## Requirements

- macOS
- zsh
- A modern terminal (developed against **WezTerm**; anything with kitty-keyboard / xterm support works)

## Install (from source)

```shell
git clone https://github.com/jeportie/smartZsh.git
cd smartZsh
npm ci
npm run build
npm link          # exposes `smartzsh` (and the short alias `smz`) on your PATH
```

## Enable in zsh

Append the plugin to your `~/.zshrc` so a session starts automatically in every new shell:

```shell
smartzsh init zsh >> ~/.zshrc
```

> Keep the smartzsh line **last** in `~/.zshrc` — anything after it may not run inside the session.

You can also start a session on demand by running `smartzsh`, and leave it with `exit`.

## Usage

| Action                    | Command       |
| ------------------------- | ------------- |
| Start a session           | `smartzsh`    |
| Stop a session            | `exit`        |
| Check if inside a session | `smartzsh -c` |

### Keybindings

Captured only while suggestions are visible; every other key passes through to zsh.

| Action                    | Key            |
| ------------------------- | -------------- |
| Accept current suggestion | <kbd>tab</kbd> |
| Next suggestion           | <kbd>↓</kbd>   |
| Previous suggestion       | <kbd>↑</kbd>   |
| Dismiss suggestions       | <kbd>esc</kbd> |

## Configuration

Optional TOML config at `~/.smartzshrc` or `$XDG_CONFIG_HOME/smartzsh/rc.toml`
(defaults to `~/.config/smartzsh/rc.toml`).

```toml
useAliases = true                          # expand your zsh aliases
useNerdFont = true                         # use NerdFont glyphs
maxSuggestions = 10                        # rows shown at once
activeSuggestionBackgroundColor = "#2E7D32"

[bindings.acceptSuggestion]
key = "tab"                                # shift / ctrl optional, default false
[bindings.nextSuggestion]
key = "down"
[bindings.previousSuggestion]
key = "up"
[bindings.dismissSuggestions]
key = "escape"
```

Key names follow Node's [keypress](https://nodejs.org/api/readline.html#readlineemitkeypresseventsstream-interface) events.

## Development

```shell
npm run try         # build + launch a session (manual testing, run it in your terminal)
npm test            # unit + snapshot tests
npm run test:e2e    # PTY end-to-end tests (real zsh, ~25s)
```

## Attribution

smartzsh is a personal fork of [microsoft/inshellisense](https://github.com/microsoft/inshellisense),
reduced to zsh-on-macOS. Licensed under the [MIT License](./LICENSE) (© Microsoft Corporation and
© Jerome Portier). Autocomplete specs are © their respective authors via
[@withfig/autocomplete](https://github.com/withfig/autocomplete).
