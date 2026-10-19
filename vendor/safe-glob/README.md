# Next ESLint directory discovery adapter

The installed Next ESLint plugin uses only `fast-glob.globSync` to find page directories and pins the interface package to version 3.3.1. This local adapter provides that interface using `tinyglobby`, avoiding the `braces` 3.0.3 recursion vulnerability for which npm has no patched release. Its version matches that interface requirement; it is a local replacement, not an upstream patched fast-glob release. It preserves Next's lint rules and directory options without downgrading Next or disabling the rules.

The root file dependency satisfies Next's exact dependency and is deduplicated into that plugin. Check its call sites, dependency tree, and directory-discovery tests whenever upgrading the plugin. Do not use this adapter as a general replacement for the full fast-glob API.
