# nsw-rfs-majorincidents-timeseries

[![Demo using Dec 2019 bushfires](demo.gif)](https://www.alantgeo.com.au/demos/nsw-bushfire-dec19-timeseries/#9.32/-34.022/150.2345)

## Live Demo

- [https://www.alantgeo.com.au/demos/nsw-bushfire-dec19-timeseries/](https://www.alantgeo.com.au/demos/nsw-bushfire-dec19-timeseries/#9.32/-34.022/150.2345)

## Usage (backend)

    yarn install
    git clone https://github.com/beyondtracks/nsw-rfs-majorincidents-archive.git
    ./index.js nsw-rfs-majorincidents-archive > timeseries.ndgeojson

This will process the whole history from the archive, to instead process a date range use:

    ./index.js --from="2019-12-20" --to="2019-12-20" nsw-rfs-majorincidents-archive > timeseries.ndgeojson

This will output two files:

- `timestamps.json` which contains metadata about the timeseries

An Object where the keys are timestamps in unix time, and the values are an array of Feature ID's which are visible for the timestamp.

- `timeseries.ndgeojson` which contains a newline-delimited GeoJSON of the timeseries geometries

You can then either convert this to MBTiles to upload as a Mapbox Tileset:

    tippecanoe --force --output timeseries.mbtiles -l timeseries timeseries.ndgeojson

...or you can convert to GeoJSON with:

    ogr2ogr -f GeoJSON -preserve_fid timeseries.geojson timeseries.ndgeojson

## Frontend

A sample visualisation web page using Mapbox GL JS contained at [`index.html`](https://github.com/beyondtracks/nsw-rfs-majorincidents-timeseries/blob/master/index.html). The app uses [`feature-states`](https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-feature-state) to very efficiently animate the data.
