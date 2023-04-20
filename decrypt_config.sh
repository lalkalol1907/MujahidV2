#!/bin/sh

# Decrypt the file
mkdir $HOME/secrets
# --batch to prevent interactive command
# --yes to assume "yes" for questions
gpg --quiet --batch --yes --decrypt --passphrase="$CONFIG_PHRSAE" \
--output $HOME/secrets/my_secret.json config.json.gpg
