# TODO: Migrate from tiptap-markdown to Tiptap v3 compatible solution

## Current Issue
- `tiptap-markdown` v0.8.10 only supports Tiptap v2
- Project uses Tiptap v3.1.0
- Using `legacy-peer-deps=true` in `.npmrc` as a temporary workaround

## Files Affected
- `/src/components/dashboard/MarkdownEditor.tsx` - Uses Markdown extension for:
  - Converting editor content to markdown (`editor.storage.markdown.getMarkdown()`)
  - Parsing markdown when setting content

## Potential Solutions

### Option 1: Custom Markdown Converter
Create custom markdown conversion using Tiptap's built-in JSON/HTML serializers:
- Use `editor.getHTML()` and convert HTML to Markdown with a library like `turndown`
- Use `markdown-it` to parse markdown to HTML, then set with `editor.commands.setContent()`

### Option 2: Wait for Official Support
Monitor Tiptap's GitHub for official v3 markdown support:
- https://github.com/ueberdosis/tiptap/issues

### Option 3: Use Alternative Package
Search for community packages that support v3:
- Check npm regularly for new packages
- Consider forking tiptap-markdown and updating for v3

## Implementation Priority
Low - Current workaround is stable and doesn't affect functionality

## Notes
- The `.npmrc` file with `legacy-peer-deps=true` allows Vercel builds to succeed
- No functional issues observed with the peer dependency mismatch
- Consider migration when official v3 support is available