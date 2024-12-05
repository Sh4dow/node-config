check_defined = \
    $(strip $(foreach 1,$1, \
        $(call __check_defined,$1,$(strip $(value 2)))))
__check_defined = \
    $(if $(value $1),, \
      $(error Undefined $1$(if $2, ($2))))

test-style:
	npx eslint --ignore-pattern=test --ignore-pattern=public/js --ignore-pattern=public/apidoc --ignore-pattern=models/failed_login.js .

test-unit:
	node_modules/.bin/mocha ./test

taglog:
	@git log `git describe --tags --abbrev=0`..HEAD --format=" * [ %h ] %s (%cn)" --reverse

# tag message without commit hash and markdown
tagMessage:
	@git log `git describe --tags --abbrev=0`..HEAD --format="%s (%cn)" --reverse


releaseLog:
	$(call check_defined, CI_COMMIT_TAG, "CI_COMMIT_TAG is not defined")
	@git log `git tag --sort=creatordate |grep -B 1 ${CI_COMMIT_TAG}|head -1`..${CI_COMMIT_TAG} --format=" * [ %h ] %s (%cn)" --reverse|grep -E "^(\s\*\s\[\s[0-9a-z]{6,8}\s\]\s)?(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([^)]+\))?:"


fastPatch:
	$(call check_defined, TAG, "TAG is not defined")
	@mkdir -p ./release

	@git flow release start ${TAG}
	@make taglog > release/${TAG}.log
	@git add release/${TAG}.log
# changelog
	@conventional-changelog --ver=${TAG}
	@git commit -m "version bump" package.json CHANGELOG.md release/${TAG}.log
# tag message
	@make tagMessage|grep -E "^(\s\*\s\[\s[0-9a-z]{6,8}\s\]\s)?(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([^)]+\))?:" > /tmp/tagMessage
	@git flow release finish -f /tmp/tagMessage ${TAG}
	@git push --all --follow-tags
	@unlink /tmp/tagMessage
#generate gitlab release message
	@echo -n '{ "name": "${TAG}", "tag_name": "${TAG}", "description": "' > /tmp/release.json
	@cat release/${TAG}.log \
		| grep -E "^(\s\*\s\[\s[0-9a-z]{6,8}\s\]\s)?(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([^)]+\))?:" \
		| awk -v ORS='\\n' '1' >> /tmp/release.json
	@echo -n '"}' >> /tmp/release.json
	@cat /tmp/release.json
#create release with changelog message
	@curl --header 'Content-Type: application/json' --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
		--data "@/tmp/release.json" \
		--request POST "${GITLAB_HOST}/api/v4/projects/228/releases"
	@unlink /tmp/release.json
