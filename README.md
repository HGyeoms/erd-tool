# ERD Designer

A lightweight, browser-based Entity Relationship Diagram tool for backend developers.
No sign-up, no server, no bloat — just paste DDL or design schemas visually.

## Features

### DDL Import / Export
- Paste `CREATE TABLE` statements and get an instant visual diagram
- Supports both **PostgreSQL** and **MySQL** syntax
- Handles primary keys, foreign keys, NOT NULL, DEFAULT, and more
- Export your visual schema back to valid DDL (PG or MySQL dialect)

### Visual Schema Editor
- **Drag-and-drop** table positioning on an infinite canvas
- **Add tables** with a single click (auto-generates `id` column)
- **Edit columns** — name, type (18 SQL types), primary key, nullable, default value
- **Create relationships** by dragging from column handle to column handle
- **Change relationship type** by clicking the label on a relationship line (cycles through `1:1` / `1:N` / `N:M`)
- **Crow's foot notation** for visually distinct cardinality indicators

### Canvas
- Zoom and pan with mouse wheel / trackpad
- Snap-to-grid (16px)
- MiniMap for navigation
- Zoom controls
- **Auto-layout** powered by dagre algorithm (minimizes line crossings)

### Quality of Life
- **Undo / Redo** — full history (up to 50 states) via `Ctrl+Z` / `Ctrl+Shift+Z`
- **Auto-save** — schema persists to `localStorage`, survives page refresh
- **Dark theme** — professional dark UI designed for long sessions
- **Editable table names** — double-click to rename
- **Friendly error messages** — invalid DDL shows helpful feedback, never raw stack traces

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Canvas | [React Flow](https://reactflow.dev/) (SVG-based) |
| State | Zustand + zundo (undo/redo middleware) |
| Layout | dagre (directed graph auto-layout) |
| Styling | Tailwind CSS v4 (dark theme) |
| Build | Vite 8 |

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Production build
bun run build

# Preview production build
bun run preview
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Quick Start

### Option 1: Import existing DDL

1. Click **Import DDL** in the toolbar
2. Paste your SQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  author_id INTEGER NOT NULL,
  published BOOLEAN DEFAULT false,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

3. Click **Parse & Import** — tables and relationships appear on canvas
4. Click **Auto Layout** for clean arrangement

### Option 2: Design from scratch

1. Click **Add Table** in the toolbar
2. Select the table in the sidebar to edit columns
3. Add columns, set types, mark primary keys
4. Drag from a column's right handle to another table's column to create a relationship
5. Click the relationship label (`1:N`) to cycle through `1:1` / `1:N` / `N:M`

## Project Structure

```
src/
  types/
    schema.ts           # Data model (Table, Column, Relationship, Schema)
  store/
    schema-store.ts     # Zustand store with undo/redo + localStorage persistence
  lib/
    ddl-parser.ts       # DDL -> Schema parser (PostgreSQL + MySQL)
    ddl-exporter.ts     # Schema -> DDL generator (dialect-aware)
    auto-layout.ts      # dagre-based graph layout
  components/
    App.tsx             # Main layout (Toolbar + Sidebar + Canvas)
    Canvas.tsx          # React Flow canvas with custom nodes/edges
    TableNode.tsx       # Custom node: table card with column list + handles
    RelationshipEdge.tsx # Custom edge: crow's foot notation + click to change type
    Sidebar.tsx         # Schema explorer + column property editor
    Toolbar.tsx         # Action buttons (Add, Import, Export, Layout, Undo, Redo)
    DDLModal.tsx        # Import/Export DDL modal with dialect selector
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected table or relationship |
| `Scroll` | Zoom in/out |
| `Click + Drag` (canvas) | Pan |
| `Click + Drag` (table) | Move table |
| `Double-click` (table name) | Edit table name |

## Data Persistence

Schemas are saved to browser `localStorage` under key `erd-tool-schema`. Every change auto-saves immediately. Data survives page refresh but not browser data clearing.

## License

MIT
