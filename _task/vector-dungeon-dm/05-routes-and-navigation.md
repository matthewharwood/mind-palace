# Issue 05: Routes And Navigation

## Goal

Expose the DM app from the root experience while preserving the existing study guide.

## Implementation

- Update the splash to show "Study Guide" and "Dungeon Master Apps".
- Add `/apps` as the application hub.
- Add `/apps/vector-dungeon` as the DM app route.
- Add a print-source route for the student guide.
- Add route `head` metadata and canonical links.
- Update breadcrumbs/nav where needed.

## Acceptance

- Root navigation reaches both the learning path app and the DM app.
- Routes prerender and appear in the sitemap.

