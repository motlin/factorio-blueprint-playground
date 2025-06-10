set shell := ["bash", "-O", "globstar", "-c"]
set dotenv-filename := ".envrc"

import ".just/git.just"
import ".just/git-rebase.just"
import ".just/git-test.just"

# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm run {build:types, build, lint:fix, test:coverage}`
build:
    #!/usr/bin/env bash
    set -uo pipefail

    COMMIT_MESSAGE=$(git log --format=%B -n 1 HEAD)
    SKIPPABLE_WORDS=("skip" "pass" "stop" "fail")

    for word in "${SKIPPABLE_WORDS[@]}"; do
        if [[ $COMMIT_MESSAGE == *\[${word}\]* ]]; then
            echo "Skipping due to [${word}] in commit: '$COMMIT_MESSAGE'"
            exit 0
        fi
    done

    EXIT_CODE=0
    FAILED_COMMAND=""

    npm install || { EXIT_CODE=$?; FAILED_COMMAND="npm install"; }
    [ $EXIT_CODE -eq 0 ] && npm run build:types || { EXIT_CODE=$?; FAILED_COMMAND="npm run build:types"; }
    [ $EXIT_CODE -eq 0 ] && npm run build || { EXIT_CODE=$?; FAILED_COMMAND="npm run build"; }
    [ $EXIT_CODE -eq 0 ] && npm run lint:fix || { EXIT_CODE=$?; FAILED_COMMAND="npm run lint:fix"; }
    [ $EXIT_CODE -eq 0 ] && npm run test:coverage || { EXIT_CODE=$?; FAILED_COMMAND="npm run test:coverage"; }

    if [ $EXIT_CODE -eq 0 ]; then
        exit 0
    fi

    DIRECTORY=$(basename $(pwd))
    MESSAGE="Failed in directory ${DIRECTORY} on command '${FAILED_COMMAND}' from commit: '${COMMIT_MESSAGE}' with exit code ${EXIT_CODE}"
    {{echo_command}} "$MESSAGE"
    exit $EXIT_CODE

# `npm run dev`
dev: install
    npm run dev

# `npm run test`
test: install
    npm run test

# `npm run test:coverage`
test-coverage: install
    npm run test:coverage

# `npm run generate:routes`
generate-routes: install
    npm run generate:routes

# `npm run lint:fix`
lint-fix: install
    npm run lint:fix

# `npm run format:css`
format-css: install
    npm run format:css

# `npm run ci:lint`
ci-lint: install
    npm run ci:lint

# `npm run ci:format`
ci-format: install
    npm run ci:format

# `npm run ci:typecheck`
typecheck: install
    npm run ci:typecheck

# `npm run ci:test`
ci-test: install
    npm run ci:test

# Format all files: Biome for JS/TS, Prettier for CSS
format: lint-fix format-css

# `uv tool run pre-commit run`
hooks:
    uv tool run pre-commit run

# `npm install`
install:
    npm install

# Run all checks before committing
precommit: install generate-routes lint-fix format hooks typecheck build ci-test
    @echo "✅ All pre-commit checks completed successfully."

factorio_home := env('FACTORIO_HOME')

# `factorio --dump-icon-sprites`
dump-icon-sprites:
    {{factorio_home}}/factorio --dump-icon-sprites

# `rsync` from `factorio/script-output` to `./public`
sync-icon-sprites:
    rsync -av ~/Library/Application\ Support/factorio/script-output/entity/*.png         ~/projects/factorio-blueprint-playground/public/icons/entity/
    rsync -av ~/Library/Application\ Support/factorio/script-output/fluid/*.png          ~/projects/factorio-blueprint-playground/public/icons/fluid/
    rsync -av ~/Library/Application\ Support/factorio/script-output/item-group/*.png     ~/projects/factorio-blueprint-playground/public/icons/item-group/
    rsync -av ~/Library/Application\ Support/factorio/script-output/item/*.png           ~/projects/factorio-blueprint-playground/public/icons/item/
    rsync -av ~/Library/Application\ Support/factorio/script-output/quality/*.png        ~/projects/factorio-blueprint-playground/public/icons/quality/
    rsync -av ~/Library/Application\ Support/factorio/script-output/recipe/*.png         ~/projects/factorio-blueprint-playground/public/icons/recipe/
    rsync -av ~/Library/Application\ Support/factorio/script-output/space-location/*.png ~/projects/factorio-blueprint-playground/public/icons/space-location/
    rsync -av ~/Library/Application\ Support/factorio/script-output/technology/*.png     ~/projects/factorio-blueprint-playground/public/icons/technology/
    rsync -av ~/Library/Application\ Support/factorio/script-output/tile/*.png           ~/projects/factorio-blueprint-playground/public/icons/tile/
    rsync -av ~/Library/Application\ Support/factorio/script-output/virtual-signal/*.png ~/projects/factorio-blueprint-playground/public/icons/virtual-signal/
    npm run prebuild

# Override this with a command called `woof` which notifies you in whatever ways you prefer.
# My `woof` command uses `echo`, `say`, and sends a Pushover notification.
echo_command := env('ECHO_COMMAND', "echo")
