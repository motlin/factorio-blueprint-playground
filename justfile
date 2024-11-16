set shell := ["bash", "-O", "globstar", "-c"]
set dotenv-filename := ".envrc"

import ".just/git.just"
import ".just/git-rebase.just"
import ".just/git-test.just"

default:
    npm install
    npm run build
    npm run coverage
    npm run lint:fix
    npm run typecheck

dump-tree:
    dump-tree --line-numbers --ignore test/fixtures --ignore .vite --ignore requirements/ --ignore public/icons --ignore src/factorio.css --ignore stats.html > ../factorio-blueprint-playground.txt

factorio_home := env('FACTORIO_HOME')

dump-icon-sprites:
    {{factorio_home}}/factorio --dump-icon-sprites

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
