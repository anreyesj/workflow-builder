# Workflow Builder

A visual single-page application for creating and editing [Arazzo](https://spec.openapis.org/arazzo/v1.0.0) workflow specifications.

## What is Arazzo?

Arazzo is an OpenAPI standard for describing workflows — chains of API requests that share data, have success/failure conditions, and express specific use cases of one or more APIs. It acts as a flat-file specification for complex, multi-step API interactions.

## Features

- **2-pane editor**: Tools panel on the left, live spec output on the right
- **Visual workflow builder**: Add/edit/remove workflows and steps without writing YAML by hand
- **API source management**: Register OpenAPI or Arazzo source specs by URL
- **Live YAML/JSON preview**: See the generated Arazzo spec update in real time as you edit
- **Import/export**: Paste existing Arazzo YAML or JSON to load and edit it
- **Sample spec**: Pre-loaded Petstore workflow example to get you started

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) with TypeScript
- [js-yaml](https://github.com/nodeca/js-yaml) for YAML serialization
- Svelte stores for reactive state management

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── app.html                    # Root HTML with global CSS variables
├── lib/
│   ├── components/
│   │   ├── ToolsPanel.svelte   # Left pane: workflow editor tools
│   │   └── CodePanel.svelte    # Right pane: live spec preview
│   ├── data/
│   │   └── sample-arazzo.ts    # Sample Petstore Arazzo spec
│   ├── stores/
│   │   └── workflow.ts         # Svelte store for spec state
│   └── types/
│       └── arazzo.ts           # TypeScript types for Arazzo spec
└── routes/
    ├── +layout.svelte          # Root layout
    └── +page.svelte            # Main page (2-pane layout)
```
