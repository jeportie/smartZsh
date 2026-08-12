# Minimal deterministic zsh config for e2e tests.
# No oh-my-zsh, no powerlevel10k, no plugins — startup stays quiet and fast so
# the tests observe smartzsh's own prompt and suggestions, not a prompt framework.
# Real oh-my-zsh/p10k integration is validated manually in WezTerm, not here.

# Don't write a history file into the fixture dir during tests.
HISTFILE=/dev/null
SAVEHIST=0
