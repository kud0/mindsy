# StudentDesk Data Structure

This directory contains JSON data structures and schemas for the StudentDesk component.

## File Organization

- `sample-lecture.json` - Main JSON structure provided by user (primary data source)
- `schema.json` - TypeScript interface definitions generated from sample JSON
- `test-cases/` - Additional test JSON files for different scenarios

## Purpose

This data-driven approach replaces the complex API parsing logic with:
1. **Predictable Structure**: Single source of truth for data format
2. **Easy Testing**: Swap JSON files for different test cases
3. **Clear Contract**: Components know exactly what data to expect
4. **Maintainable**: Simple data flow without complex transformations

## Usage

The JSON structure defined here is used by:
- `components/notes/StructuredStudyDesk.tsx` - Main component
- `/app/api/lectures/[jobId]/route.ts` - Simplified API endpoint
- Individual tab components for rendering

## Data Flow

```
User JSON → TypeScript Interfaces → Component Props → Tab Rendering
```