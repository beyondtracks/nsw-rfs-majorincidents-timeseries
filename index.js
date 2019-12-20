#!/usr/bin/env node

const os = require('os');
const path = require('path');
const git = require('isomorphic-git');
const _ = require('lodash');
const equal = require('fast-deep-equal');
const { DateTime } = require('luxon');
const fs = require('fs');
git.plugins.set('fs', fs)
const argv = require('minimist')(process.argv.slice(2));

if (argv._.length === 0) {
    console.error('Usage: ./index.js <pathToRepo>');
    process.exit(1);
}

const dir = require('path').resolve(argv._[0])
const filepath = 'nsw-rfs-majorincidents.geojson'

;(async () => {
    const commits = await git.log({ dir })

    /*
     * tsi -> Time Series Index
     * fid -> Feature ID
     * gv - > Geometry Varient
     * gvi - > Geometry Varient Index
     */

    // store the geometry variants for each feature
    // fid -> [gv, ...]
    const geomVariants = {};
    
    // for each time series index, store which feature and geometry variant should be shown
    // tsi -> [[fid, gvi], ...]
    const tsGeoms = {};

    // a new global unique id that combines the original feature id and the the geometry variant index
    // "fid.gvi" => guid
    const guids = {};

    // a mapping of time series index -> feature ids to show

    for (const commit of _.reverse(commits)) {
        try {
            // time series index
            const tsi = Number(commit.committer.timestamp);

            const start = argv.start && DateTime.fromISO(argv.start);
            const end = argv.end && DateTime.fromISO(argv.end);
            const current = DateTime.fromSeconds(tsi);

            if (
                (!start || !end) ||
                (current >= start.startOf('day') && current <= end.endOf('day'))
            ) {
                tsGeoms[tsi] = [];

                const { object: blob} = await git.readObject({ dir, oid: commit.oid, filepath })
                const geojson = JSON.parse(blob.toString('utf8'));

                let geomVariantsAddedThisTime = 0;
                for (const feature of geojson.features) {
                    feature.id = extractID(feature.properties.guid);
                    if (feature.id in geomVariants) {
                        // this feature is found, lets see if this one is different to the previous
                        const prevIndex = geomVariants[feature.id].length - 1;
                        const prevGeom = geomVariants[feature.id][prevIndex];

                        if (equal(prevGeom, feature.geometry)) {
                            // this geometry is the same as the last one

                            let guid;
                            if (`${feature.id}.${prevIndex}` in guids) {
                                guid = guids[`${feature.id}.${prevIndex}`];
                            } else {
                                guid = Object.keys(guids).length;
                                guids[`${feature.id}.${prevIndex}`] = guid;
                            }

                            tsGeoms[tsi].push(guid);
                        } else {
                            // this geometry is different, so add it
                            const length = geomVariants[feature.id].push(feature.geometry);

                            let guid;
                            if (`${feature.id}.${length - 1}` in guids) {
                                guid = guids[`${feature.id}.${length - 1}`];
                            } else {
                                guid = Object.keys(guids).length;
                                guids[`${feature.id}.${length - 1}`] = guid;
                            }

                            tsGeoms[tsi].push(guid);
                        }
                    } else {
                        // this feature not yet found, so add it
                        geomVariants[feature.id] = [feature.geometry];

                        const guid = Object.keys(guids).length;
                        guids[`${feature.id}.0`] = guid;

                        tsGeoms[tsi].push(guid);

                        geomVariantsAddedThisTime++;
                    }
                }

                process.stderr.write(`${(new Date(tsi * 1000)).toString()} ...${geomVariantsAddedThisTime}\n`);
            }
        } catch (err) {
            console.error(err);
            // file not found in this commit
        }
    }

    Object.entries(geomVariants).forEach(([fid, variants]) => {
        variants.forEach((variant, index) => {
            const id = guids[`${fid}.${index}`];
            const feature = {
                type: 'Feature',
                id: id,
                properties: {},
                geometry: variant
            };
            console.log(JSON.stringify(feature));
        });
    });

    fs.writeFileSync('timestamps.json', JSON.stringify(tsGeoms));
})()

function extractID(guid) {
    if (guid) {
        const matches = guid.match(/([0-9]*)$/);
        if (matches && matches.length === 2) {
            const integer = Number.parseInt(matches[1]);
            if (Number.isFinite(integer)) {
                return integer;
            }
        }
    }

    return null;
}
