# VuDL

VuDL is the ingest and management platform that powers [Villanova University's Digital Library](https://digital.library.villanova.edu/).

## About this Project

This project provides an interface (driven by a JSON API) for managing review and pagination of jobs prior to their import into a digital repository, as well as additional tools for managing that repository after it has been populated. It is intended to be used in combination with [Fedora Commons](https://fedora.lyrasis.org/) and [VuFind®](https://vufind.org), among other dependencies (see below for further details).

## Ingest Workflow / Assumptions

For data ingestion purposes, this software assumes a two-tiered set of directories, in which the top tier represents categories and the second tier represents jobs.

Each category folder is expected to contain a batch-params.ini file that controls parameters for the category. For example:

```
[collection]
; PID of holding area object in Fedora:
destination = vudl:5

[ocr]
; Should we perform OCR on the jobs in this category?
ocr = 'true'

[pdf]
; Should we generate a PDF if none is already in the folder?
generate = 'true'
```

For image-based jobs, each job folder is expected to contain TIFF images of a multi-page item. For example:

```
/usr/local/holding
    /category1
        /batch-params.ini
        /job1
            0001.TIF
            0002.TIF
```

The software provides functionality for automatically generating JPEG derivatives of these TIFFs as well as assigning labels to the pages within the jobs. When all of this work has been completed, the finished data can be published to a repository. (Currently, this is designed for a Fedora 6-based repository).

Job folders can also include PDF files (for document-based jobs), FLAC files (for audio-based jobs) or AVI/MKV/MOV/MP4 files (for video-based jobs).
Videos may optionally be accompanied by .txt or .vtt files containing transcripts -- the filenames just need to match (e.g. myVideo.vtt and myVideo.mp4).

## Dependencies

This is a complex system which uses a large number of tools to manage a digital repository.

The software is written in node.js, but requires quite a few external tools to accomplish its goals. You should install the external tools first, then the Javascript dependencies.

This software is designed to run on multiple operating systems; however, Ubuntu (or other Debian flavors) tend to be the quickest and easiest because of the availability of easy-to-install packages for most of the external dependencies.

### External Dependencies

- [Cantaloupe Image Server](https://cantaloupe-project.github.io/) (or another IIIF image server) - optional, but required when using VuFind (see below, and also [setup notes](docs/cantaloupe.md)).
- [Fedora Commons](https://duraspace.org/fedora/) - required for storing repository content
- [FFmpeg](http://ffmpeg.org/) - required for audio/video processing
- [FITS](https://projects.iq.harvard.edu/fits/home) - required for file characterization
- [ImageMagick](https://imagemagick.org) - required by textcleaner (see below)
- [OCRmyPDF](https://ocrmypdf.readthedocs.io) - required for OCR enhancement of PDFs
- [Redis](https://redis.io/) - required to support queue features
- Relational Database ([SQLite](https://www.sqlite.org) by default, or MySQL/MariaDB by configuration) - required for user session persistence and PID generation
- [Solr](https://solr.apache.org/) - required for searching/indexing content; it is recommended that you use the instance bundled with VuFind (see below)
- [tesseract-ocr](https://github.com/tesseract-ocr/) - required for OCR of image files
- [textcleaner](http://www.fmwconcepts.com/imagemagick/textcleaner/index.php) - required for cleanup of image files prior to OCR
- [Tika](https://tika.apache.org/) - required for text extraction from document files
- [VuFind](https://vufind.org) - strongly recommended as the public front-end for the repository

### Javascript Dependencies

- Node.js (developed and tested with v15)
- NPM (`npm install -g npm`)
- Execute `npm install` to install root node dependencies
- Execute `npm run setup` to install node dependencies in subdirectories

### Underlying Technologies
- [Express.js](https://expressjs.com)
- [React.js](https://reactjs.org)
- [BullMQ](https://github.com/taskforcesh/bullmq)

## Set up configuration in the api directory

Copy api/vudl.ini.dist to api/vudl.ini, and configure it using a text editor.

This configuration file allows you to specify where files will be stored during ingest/processing, as well as the paths to the various external tools required by this package.

## Running the dev server

In two separate terminals or panes, run:
1. `npm run api:watch` to run Typescript for the API code
1. `npm run dev` to fire up all dev servers

After a few moments, a new tab should automatically open in your browser pointing to `localhost:3000`. Refresh until the app appears.

## NPM Scripts

| Script | Description |
| - | - |
| api | run node api server |
| api:build | Build api Typescript |
| api:dev | run api server, restart server on changes |
| api:format | format only the api code with [Prettier](https://prettier.io) |
| api:lint | lint only the api code |
| api:saml:metadata | output SAML SP metadata to share with an IdP |
| api:setup | install npm dependencies in api/ |
| | |
| client | run react-scripts server |
| client:build | build React code for production |
| client:format | format only the client code with [Prettier](https://prettier.io) |
| client:lint | lint only the api code |
| client:setup | install npm dependencies in client/ |
| client:snapshots | update snapshots used by test suite |
| client:test | run client unit tests with test coverage |
| client:testWatch | run client unit tests while watching source folders |
| | |
| queue | start job queue worker (call with `-- [queuename]` to specify a non-default queue to monitor)|
| queue:dev | start job queue worker, restart on changes |
| | |
| ingest | add all published jobs to the ingest queue |
| | |
| backend | start both api and worker queue servers |
| backend:dev | start both api and worker queue servers, restart on changes |
| | |
| build | build entire project for production |
| dev | run api, client, and queue dev servers (auto-restart) |
| format | format all code with [Prettier](https://prettier.io) |
| lint | report lint errors in all code |
| setup | install subdirectory npm dependencies |
| start | run api, client, and queue servers (production) |
| test  | run both client and api tests |
| watch | alias for api:watch |
