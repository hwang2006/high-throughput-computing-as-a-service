#!/usr/bin/env bash

# FIXME this script is duplicated from update-oojs.sh - factor this out

# This script generates a commit that updates the oojs-ui distribution
# ./bin/update-oojs-ui.sh path/to/repo/for/oojs-ui

function oojsuihash() {
	grep "OOjs UI v" lib/oojs-ui/oojs-ui.js \
		| head -n 1 \
		| grep -Eo '\([a-z0-9]+\)' \
		| sed 's/^(//' \
		| sed 's/)$//'
}

function oojsuitag() {
	grep "OOjs UI v" lib/oojs-ui/oojs-ui.js \
		| head -n 1 \
		| grep -Eo '\bv[0-9a-z.-]+\b'
}

function oojsuiversion() {
	grep "OOjs UI v" lib/oojs-ui/oojs-ui.js \
		| head -n 1 \
		| grep -Eo '\bv[0-9a-z.-]+\b.*$'
}

# cd to the VisualEditor directory
cd $(cd $(dirname $0)/..; pwd)

if [ "x$1" == "x" ]
then
	echo >&2 "Usage: update-oojs-ui.sh path/to/repo/for/oojs-ui"
	exit 1
fi

# Undo any changes in the oojs-ui directory
git reset lib/oojs-ui/
git checkout lib/oojs-ui/
# Get the old oojs-ui version
OLDVERSION=$(oojsuihash)
if [ "x$OLDVERSION" == "x" ]
then
	TAG=$(oojsuitag)
fi

# cd to the oojs-ui directory
cd $1 || exit 1
if [ "x$OLDVERSION" == "x" ]
then
	# Try the tag
	OLDVERSION=$(git rev-parse $TAG)
	if [ $? != 0 ]
	then
		echo Could not find OOjs UI version
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

# Copy files from dist/ to lib/oojs-ui
cp -a $1/dist/{oojs-ui.js,oojs-ui.svg.css,images,i18n} lib/oojs-ui/
# Figure out what the new version is
NEWVERSION=$(oojsuiversion)
# Generate commit summary
COMMITMSG=$(cat <<END
Update OOjs UI to $NEWVERSION

New changes:
$NEWCHANGES
END
)
# Commit
git commit lib/oojs-ui/ -m "$COMMITMSG"
cat >&2 <<END


Created commit with changes:
$NEWCHANGESDISPLAY
END