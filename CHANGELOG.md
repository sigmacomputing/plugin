## v1.3.0 (July 28th, 2026)

- Added opt-in incremental (append-semantics) element data delivery:
  - `subscribeToIncrementalElementData` on the client, which advertises
    incremental delivery to the host and invokes its callback with
    `WorkbookElementDataChunk` envelopes (`data`, `offset`, `isComplete`,
    `totalRows`).
  - `useIncrementalElementData` React hook, which accumulates chunks
    internally and is a drop-in replacement for `usePaginatedElementData`.
  - Hosts that do not support incremental delivery are unaffected: their
    cumulative payloads are transparently delivered as replace-everything
    chunks at offset 0, so plugins using the new API work against both host
    behaviors. All existing APIs are unchanged.

## v1.0.0 (September 23rd, 2022)

`@sigmacomputing/plugin` has moved to https://github.com/sigmacomputing/plugin and
is now open source. Feel free to create an issue or contribute by opening a pull
request. Read our `CONTRIBUTING.md` guide to get started.

#### Breaking Changes

- `@sigmacomputing/plugin-types` has been merged with `@sigmacomputing/plugin`
  and will no longer received updates in the future. Please use only
  `@sigmacomputing/plugin` going forward.
