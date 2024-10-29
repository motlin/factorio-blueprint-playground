absorb:
    git absorb --base $(git first) --force

rebase:
    git rebase --interactive --autosquash --root

push:
    git push --force-with-lease origin main
