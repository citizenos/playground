'use strict';

const core = require('@actions/core');
const github = require('@actions/github');


const runAction = async () => {
    core.debug(`PR Duplicator - Context ${github.context}`);

    const [envOwner, envRepository] = process.env.GITHUB_REPOSITORY.split('/');

    const eventPayload = github.context.payload;
    const confFrom = core.getInput('from'); // Branch from which the PR was created (head)
    const confBase = core.getInput('base'); // Branch where the PR was requested
    const confTo = core.getInput('to'); // Branch to which the new PR is created
    const prAuthor = core.getInput('pr_author'); // Who has to be author of the PR to be duplicated

    if (!eventPayload || !eventPayload.pull_request) {
        throw new Error('INVALID CONFIGURATION: Invalid event type configuration, event payload must contain "pull_request" property. See: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/events-that-trigger-workflows#pull-request-event-pull_request');
    }

    // https://developer.github.com/v3/pulls/
    const payloadPullRequest = eventPayload.pull_request;
    const payloadPullRequestId = payloadPullRequest.number; // Ex: 5
    const payloadPullRequestAuthor = payloadPullRequest.user.login; // Ex: tiblu
    const payloadBase = payloadPullRequest.base; // Branch where the PR was requested. Ex: master
    const payloadFrom = payloadPullRequest.head; // Branch from which the PR was created (head). Ex: l10n_mater

    if (payloadFrom.ref !== confFrom || payloadBase.ref !== confBase) {
        return core.info(`SKIP! Skipping Action as the configured "from" and "base" ("${confFrom}","${confBase}") don't match the event payload ("${payloadFrom}","${payloadBase}")`);
    }

    if (prAuthor && payloadPullRequestAuthor !== prAuthor) {
        return core.info(`SKIP! Skipping Action as the configured "pr_author" ("${prAuthor}") does not match the PR author in the payload ("${payloadPullRequestAuthor}")`);
    }

    // https://octokit.github.io/rest.js/
    // https://github.com/actions/toolkit/tree/master/packages/github
    const octokit = new github.GitHub({
        auth: `token ${core.getInput('github-token')}`
    });

    // https://octokit.github.io/rest.js/#octokit-routes-repos-get-branch
    // https://developer.github.com/v3/repos/branches/#get-branch
    const branchFrom = await octokit.repos.getBranch({
        owner: envOwner,
        repo: envRepository,
        branch: payloadFrom
    });

    // https://octokit.github.io/rest.js/#octokit-routes-git-create-ref
    // https://developer.github.com/v3/git/refs/#create-a-reference
    const branchCreated = await octokit.git.createRef({
        owner: envOwner,
        repo: envRepository,
        ref: `refs/heads/pr_duplicator_${branchFrom.name}_${payloadPullRequestId}`,
        sha: branchFrom.commit.sha
    });

    // https://octokit.github.io/rest.js/#octokit-routes-pulls-create
    // https://developer.github.com/v3/pulls/#create-a-pull-request
    const pullRequestCreated = octokit.pulls.create({
        owner: envOwner,
        repo: envRepository,
        title: `AUTO: PR-Duplicator - "${payloadPullRequest.title}".`,
        body: `This pull request is automatically created by GitHub Action PR Duplicator. Created from: ${payloadPullRequest.url}`,
        head: branchCreated.ref,
        base: confTo,
        maintainer_can_modify: false
    });

    core.info(`Pull request has been created - ${pullRequestCreated.url}`);
};

runAction()
    .then(function () {
        core.info('OK!');
    })
    .catch(function (err) {
        console.error('ERROR', err, github.context);
        core.setFailed(err.message);
    });