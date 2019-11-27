'use strict';

const core = require('@actions/core');
const github = require('@actions/github');

try {
    const from = core.getInput('from');
    const base = core.getInput('base');
    const to = core.getInput('to');

    console.log(`PR Duplicator - from: "${from}", base: "${base}", to: "${to}"`);
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);
} catch (error) {
    core.setFailed(error.message);
}