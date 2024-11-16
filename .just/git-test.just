# set up git-test
setup-git-test:
    git test add --forget --test default 'just default'

fail_fast := env('FAIL_FAST', "false")

# git-test on the range of commits between a configurable upstream/main and {{BRANCH}}
test-branch BRANCH="HEAD" TEST="default" *FLAGS="--retest":
    echo "Testing branch: {{BRANCH}}"
    echo "{{BRANCH}}" > JUSTFILE_BRANCH
    git test run --test {{TEST}} {{FLAGS}} {{upstream_remote}}/{{upstream_branch}}..{{BRANCH}}

# `just test` all commits with configurable upstream/main as ancestor
test-all TEST="default" *FLAGS="--retest":
    #!/usr/bin/env bash
    set -uo pipefail

    if [ "{{fail_fast}}" ]; then
        set -Ee
    fi

    branches=($(git for-each-ref --format='%(refname:short)' refs/heads/ --sort -committerdate --contains {{upstream_remote}}/{{upstream_branch}}))

    for branch in "${branches[@]}"
    do
        just test-branch "${branch}" "{{TEST}}" {{FLAGS}}
    done

alias ta := test-all

# `just test results` all branches with configurable upstream/main as ancestor
test-results:
    #!/usr/bin/env bash
    set -uo pipefail

    branches=($(git for-each-ref --format='%(refname:short)' refs/heads/ --sort -committerdate --contains {{upstream_remote}}/{{upstream_branch}}))

    for branch in "${branches[@]}"
    do
        echo "Branch: $branch"
        git test results --color {{upstream_remote}}/{{upstream_branch}}..${branch}
    done

# Fix the current commit and rebase
test-fix:
    git add --update
    git commit --fixup HEAD
    just _check-local-modifications
    cat JUSTFILE_BRANCH
    git rebase --onto HEAD HEAD^ $(cat JUSTFILE_BRANCH)
    just rebase
    cat JUSTFILE_BRANCH
    rm JUSTFILE_BRANCH
