absorb:
    git absorb --base $(git first) --force

rebase:
    git rebase --interactive --autosquash --root

push:
    git push --force-with-lease origin main

dump-tree:
    dump-tree --ignore test/fixtures --ignore .vite > ../factorio-blueprint-playground.txt

dump-icon-sprites:
    ~/Library/Application\ Support/Steam/SteamApps/common/Factorio/factorio.app/Contents/MacOS/factorio --dump-icon-sprites

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
