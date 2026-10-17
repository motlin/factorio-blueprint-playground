#!/usr/bin/env bash
# Download the most favorited factorioprints.com blueprint strings as <key>.txt files, from the same
# sources the playground uses: the key CDN first, then Firebase.
# Usage: scripts/corpus/fetch-top-blueprints.sh <output-dir> [count]
set -euo pipefail

output_directory="$1"
count="${2:-300}"
firebase='https://facorio-blueprints.firebaseio.com'

mkdir -p "$output_directory"
curl -sSf "$firebase/blueprintSummaries.json?orderBy=%22numberOfFavorites%22&limitToLast=$count" \
	| jq -r 'keys[]' \
	| while read -r key; do
		target="$output_directory/$key.txt"
		[[ -s "$target" ]] && continue
		if ! curl -sf "https://factorio-blueprint-key-cdn.pages.dev/${key:0:3}/${key:3}.txt" -o "$target"; then
			curl -sSf "$firebase/blueprints/$key/blueprintString.json" | jq -r 'strings' > "$target"
		fi
	done
