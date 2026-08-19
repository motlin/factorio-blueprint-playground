# `just --list --unsorted`
[group('default')]
default:
    @just --list --unsorted

ci := env("CI", "")

# Install dependencies
[group('setup')]
install:
    vp install
    vp fmt CLAUDE.md

# Run dev server
dev *args: install
    vp dev {{args}}

# Run linter
lint: install
    vp lint {{ if ci != "" { "--format github" } else { "--fix" } }}

# Run formatter
format: install
    vp fmt {{ if ci != "" { "--check" } else { "" } }}

# Run checks (format + lint + typecheck)
check: install
    vp check {{ if ci != "" { "" } else { "--fix" } }}

# Run tests
test *args: install
    {{ if ci != "" { "if test -x node_modules/.bin/playwright; then vp exec playwright install --with-deps chromium; fi" } else { "true" } }}
    vp run test:run {{args}}

# Type-check the project
typecheck: install
    vp run typecheck

# Build the project
build: install
    vp run build

# Apply safe Fallow fixes locally, then reject remaining dead code
fallow: install
    {{ if ci == "" { "vp run fallow" } else { "true" } }}
    vp run fallow:ci

# vp run fallow:ci
fallow-check: install
    vp run fallow:ci

# Run Storybook
storybook *args: install
    vp run storybook {{args}}

# Build an isolated Storybook review bundle
build-storybook output="storybook-static": install
    vp run build-storybook --output-dir {{output}}

# Run tagged Storybook play functions and accessibility annotations
storybook-test: install
    {{ if ci != "" { "vp exec playwright install --with-deps chromium" } else { "vp exec playwright install chromium" } }}
    vp run test:storybook

# Validate the NDA-safe game-reference manifest without requiring local image files
reference-manifest: install
    vp run visual-conformance:references

# Capture and compare the maintained Storybook visual-conformance states
visual-conformance *args: install
    {{ if ci != "" { "vp exec playwright install --with-deps chromium" } else { "vp exec playwright install chromium" } }}
    vp run build-storybook --output-dir storybook-static
    vp run visual-conformance:references
    vp run test:storybook
    vp run visual-conformance {{args}}

# Run pre-commit hooks on all files (same as CI's pre-commit job)
pre-commit: install
    pre-commit run --all-files

# Run all pre-commit checks
[arg("quick", long, value="true", help="Skip tests")]
verify quick="": check build fallow pre-commit
    {{ if quick != "true" { "just test" } else { "true" } }}
    @echo "All pre-commit checks passed!"

# Deprecated alias for `verify`
[arg("quick", long, value="true", help="Skip tests")]
precommit quick="": (verify quick)
