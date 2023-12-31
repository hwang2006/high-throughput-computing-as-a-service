#!/usr/bin/env bash

# FIXME this script is duplicated from update-oojs-ui.sh - factor this out

# This script generates a commit that updates the oojs distribution
# ./bin/update-oojs.sh path/to/repo/for/oojs

function oojshash() {
	grep "OOjs v" lib/oojs/oojs.js \
		| head -n 1 \
		| grep -Eo '\([a-z0-9]+\)' \
		| sed 's/^(//' \
		| sed 's/)$//'
}

function oojstag() {
	grep "OOjs v" lib/oojs/oojs.js \
		| head -n 1 \
		| grep -Eo '\bv[0-9a-z.-]+\b'
}

function oojsversion() {
	grep "OOjs v" lib/oojs/oojs.js \
		| head -n 1 \
		| grep -Eo '\bv[0-9a-z.-]+\b.*$'
}

# cd to the VisualEditor directory
cd $(cd $(dirname $0)/..; pwd)

if [ "x$1" == "x" ]
then
	echo >&2 "Usage: update-oojs.sh path/to/repo/for/oojs"
	exit 1
fi

# Undo any changes in the oojs directory
git reset lib/oojs/
git checkout lib/oojs/
# Get the old oojs version
OLDVERSION=$(oojshash)
if [ "x$OLDVERSION" == "x" ]
then
	TAG=$(oojstag)
fi

# cd to the oojs directory
cd $1 || exit 1
if [ "x$OLDVERSION" == "x" ]
then
	# Try the tag
	OLDVERSION=$(git rev-parse $TAG)
	if [ $? != 0 ]
	then
		echo Could not find OOjs version
		cd -
		exit 1
	fi
fi
if [ "$(git rev-parse $OLDVERSION)" == "$(git rev-parse HEAD)" ]
then
	echo "No changes (already at $OLDVERSION)"
	cd -
	exit 0
fi
# Build the distribution
grunt
# Get the list of changes
NEWCHANGES=$(git log $OLDVERSION.. --oneline --no-merges --reverse --color=never)
NEWCHANGESDISPLAY=$(git log $OLDVERSION.. --oneline --no-merges --reverse --color=always)
# cd back to the VisualEditor directory
cd -

# Copy files from dist/ to lib/oojs
cp -a $1/dist/* lib/oojs/
# Figure out what the new version is
NEWVERSION=$(oojsversion)
# Generate commit summary
COMMITMSG=$(cat <<END
Update OOjs to $NEWVERSION

New changes:
$NEWCHANGES
END
)
# Commit
git commit lib/oojs/ -m "$COMMITMSG"
cat >&2 <<END


Created commit with changes:
$NEWCHANGESDISPLAY
END