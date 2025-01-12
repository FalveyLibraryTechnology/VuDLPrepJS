# Changelog

All notable changes to this project will be documented in this file, in reverse chronological order by release.

## 2.5 - TBD

### Added

- Nothing.

### Changed

- MySQL connections are now managed by the mysql2 driver instead of mysql for improved support/compatibility. If you use MySQL or MariaDB, be sure to change `mysql` to `mysql2` in your `api/vudl.ini` file!

### Deprecated

- Nothing.

### Removed

- Nothing.

### Fixed

- Nothing.

## 2.4 - 2024-08-08

### Added

- All back-end edit routes include no-cache headers to prevent outdated results from being cached in the browser.
- The last page you accessed in each child list is remembered, so when you return to a list from another page, you will be on the last page viewed.
- Formal trash support can be enabled using the trash_pid setting in vudl.ini.
- Objects can be moved in a single step (instead of requiring the add parent / delete parent steps).

### Changed

- Nothing.

### Deprecated

- Nothing.

### Removed

- Nothing.

### Fixed

- Changing the state of an object with mixed-state children no longer causes duplicate Fedora writes, and is no longer blocked if the desired state is the same as the existing top-level object state.
- The logout button no longer appears inappropriately when the user is not logged in.

## 2.3 - 2024-07-24

### Added

- Agent metadata can be cloned.
- Child/descendant count displays in object editor.
- "Copy PID" button.
- Countdown in status message when updating multiple object states.
- Models are visible in the object editor.
- Process metadata can be cloned.
- Recent PIDs are now available in the PID selector.

### Changed

- Nothing.

### Deprecated

- Nothing.

### Removed

- Nothing.

### Fixed

- Generated PDFs now match the active/inactive state of the object within which they are generated.
- It is no longer possible to create illegal containment relationships.
- PDF generator and Solr indexer tools now trim unnecessary whitespace from user input.
- PID validation is stricter to prevent bad data from being sent to Fedora.
- "Scroll to thumbnail" in the paginator now works even after switching between jobs.

## 2.2 - 2024-07-11

### Added

- Bulk edit tool (currently only able to change licenses).
- Public domain mark option in example license configuration.

### Changed

- Index jobs now fail when missing parents are detected.
- Index jobs now automatically trigger child record indexing when certain parent details change.
- Index workers now retry up to 3 times before throwing exceptions.
- Removal of files by SolrCache class is more tolerant of race conditions.
- Snackbar and modal state handling have been refactored to a new GlobalContext.
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
