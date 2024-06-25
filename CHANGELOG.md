# Changelog

All notable changes to this project will be documented in this file, in reverse chronological order by release.

## Next Release - TBD

### Added

- Nothing.

### Changed

- Index jobs now fail when missing parents are detected.
- Index jobs now automatically trigger child record indexing when certain parent details change.
- Index workers now retry up to 3 times before throwing exceptions.
- Removal of files by SolrCache class is more tolerant of race conditions.
- Updated dependencies.

### Deprecated

- Nothing.

### Removed

- Nothing.

### Fixed

- Problem with cached data getting "stuck" when re-indexing.
- Race condition when processing the same index job in multiple queues.

## 2.1 - 2023-11-28

### Added

- Optional on-disk caching of Solr documents (see solr_document_cache_dir in vudl.ini) to improve indexing and queueing performance.
- Tools for rebuilding the Solr index from the on-disk cache.

### Changed

- Updated dependencies.

### Deprecated

- Nothing.

### Removed

- Nothing.

### Fixed

- Date normalization bug (October is no longer converted to January).
- Missing exception messages no longer cause fatal errors in messenger routes.

## 2.0 - 2023-07-12

### Added

- Basic video support.

### Changed

- Fully rewritten in Node.js/React.
- Updated for compatibility with Fedora 6.

### Deprecated

- Nothing.

### Removed

- Support for Fedora 3.

### Fixed

- Nothing.

## 1.0 - 2013-10-14

Initial release (in a [separate Git repo](https://github.com/vufind-org/vudl)).
