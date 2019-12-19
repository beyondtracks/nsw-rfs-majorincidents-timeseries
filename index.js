#!/usr/bin/env node

const Git = require('nodegit');
const argv = require('minimist')(process.argv.slice(2));

if (argv._.length === 0) {
    console.error('Usage: ./index.js <pathToRepo>');
    process.exit(1);
}

const relativePathToRepo = argv._[0];
const pathToRepo = require('path').resolve(relativePathToRepo);
const historyFile = 'nsw-rfs-majorincidents.geojson';

let repo;
let historyCommits = [];

function compileHistory(resultingArrayOfCommits) {
    var lastSha;
    if (historyCommits.length > 0) {
        lastSha = historyCommits[historyCommits.length - 1].commit.sha();
        if (
            resultingArrayOfCommits.length == 1 &&
            resultingArrayOfCommits[0].commit.sha() == lastSha
        ) {
            return;
        }
    }

    resultingArrayOfCommits.forEach(function(entry) {
        historyCommits.push(entry);
    });

    lastSha = historyCommits[historyCommits.length - 1].commit.sha();

    walker = repo.createRevWalk();
    walker.push(lastSha);
    walker.sorting(Git.Revwalk.SORT.TIME);

    return walker.fileHistoryWalk(historyFile, 500)
        .then(compileHistory);
}

Git.Repository.open(pathToRepo)
    .then((r) => {
        repo = r;
        return repo.getMasterCommit();
    })
    .then((latestCommitOnMaster) => {
        const walker = repo.createRevWalk();
        walker.push(latestCommitOnMaster.sha());
        walker.sorting(Git.Revwalk.SORT.Time);

        return walker.fileHistoryWalk(historyFile, 500);
    })
    .then(compileHistory)
    .then(() => {
        return historyCommits.map(function(entry) {
            const commit = entry.commit;
            console.log("commit " + commit.sha());
            console.log("Author:", commit.author().name() +
                " <" + commit.author().email() + ">");
            console.log("Date:", commit.date());
            console.log("\n    " + commit.message());

            /*
            commit.getEntry(historyFile).then((commitEntry) => {
                return commitEntry.getBlob();
            })
            .then((blob) => {
                console.log(blob.toString());
                return blob;
            })
            .done();
            */

            return entry;
        });
    })
    .done();
