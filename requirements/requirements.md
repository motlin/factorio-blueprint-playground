# Factorio Blueprint Playground

We are writing a web application to parse and display Factorio blueprints. Factorio is a popular video game where players build factories to automate the production of items. Players can save their factories as blueprints, which are encoded in a custom format.

The playground will allow users to paste blueprints, see a summary of the blueprint, and explore the contents of the blueprint. Users will be able to make minor edits to the blueprint. They can explore the history of blueprints they have uploaded. Users can split and join blueprint books, by downloading a single blueprint within a book, or downloading a synthesized blueprint book from their full history.

## Parsing Factorio Blueprints

The title of the page should be "Factorio Blueprint Playground." Below the title, there should be a textarea that says "Paste your blueprint here." The textarea should be rendered small, since the data isn't human-readable.

There shouldn't be any button to parse the blueprint. As soon as a paste is detected, the blueprint should be parsed and displayed.

The way that Factorio Blueprint parsing works:

- Remove the '0' prefix
- Decode the base64 string
- Decompress the zlib data
- Parse the JSON

## Displaying Blueprint Information

Below the header where the user pastes the blueprint, we will have a section to display parsed information about the blueprint. I'd like to have the below section to be split vertically, and for each section I describe below to be in a collapsible panel. The user can click on the panel to expand or collapse the section.

### Basic information panel

First panel on the left.

- Root blueprint label
- Root blueprint description
- Game version
- Root blueprint type, like blueprint, blueprint book, upgrade planner, deconstruction planner. This can be an icon.
- The up to 4 icons.
- Whether the root blueprint uses parameters
- Whether the root blueprint uses 2.0 features
- Whether the root blueprint uses Space Age features
- Whether the root blueprint uses Quality features
- Whether the root blueprint uses Elevated Rails features

### Blueprint tree panel

Second panel on the left. The panel is only displayed if the root blueprint is a blueprint book.

Display a tree of the blueprints in the book, showing its recursive structure.

If the current row represents a deconstruction planner or upgrade planner, the row should start with the relevant icon.

Each row in the tree should show the 4 icons and label of the blueprint.

The row should change color on hover to indicate that it is clickable. We should respond to clicks on the row by displaying the summary information about that blueprint in the summary panel, and the selected row should be highlighted.

### Summary panel

First panel on the right. This panel is only displayed when there is a selected blueprint. If the root blueprint is a plain blueprint, this panel is displayed by default.

- Label
- Description
- Game version
- Blueprint type, like blueprint, blueprint book, upgrade planner, deconstruction planner.
- Icons
- Whether the blueprint uses snap-to-grid, and if so, whether it's absolute or relative.
- Whether the blueprint uses parameters
- Whether the blueprint uses 2.0 features
- Whether the blueprint uses Space Age features
- Whether the blueprint uses Quality features
- Whether the blueprint uses Elevated Rails features

### Contents panel

Second panel on the right. This panel is only displayed when there is a selected blueprint.

- Table of entities
- Table of recipes
- Table of tiles

All tables have the following columns:

- Icon
- Count
- Name

### Upgrade planner panel

This panel is only displayed when the selected blueprint type is an upgrade planner.

The upgrade planner structure looks like this:
```json
{
  "upgrade_planner": {
    "settings": {
      "mappers": [
        {
          "from": {
            "type": "entity",
            "name": "underground-belt"
          },
          "to": {
            "type": "entity",
            "name": "fast-underground-belt"
          },
          "index": 0
        }
      ]
    },
    "item": "upgrade-planner",
    "version": 73014509569
  }
}
```

Display upgrade mappings in a vertical list, sorted by the index field. Each mapping shows:
- The "from" item with its icon
- An arrow (→)
- The "to" item with its icon

### Deconstruction planner panel

This panel is only displayed when the selected blueprint type is a deconstruction planner. The structure looks like this:

```json
{
  "deconstruction_planner": {
    "settings": {
      "trees_and_rocks_only": true,
      "tile_selection_mode": 3,
      "entity_filters": [
        {
          "name": "laser-turret",
          "index": 0
        }
      ]
    },
    "item": "deconstruction-planner",
    "label": "Optional Label",
    "version": 281479276658688
  }
}
```

The panel should show:
- Special modes (like "trees_and_rocks_only")
- Tile selection mode (values: 2="Never deconstruct tiles", 3="Always deconstruct tiles")
- Entity filters, if present, showing icons and names sorted by index

### Parameters panel

This panel is only displayed when the blueprint contains parameters. Parameters appear in the following structure:

```json
"parameters": [
  {
    "type": "id",
    "name": "Primary",
    "id": "parameter-0",
    "quality-condition": {
      "quality": "normal",
      "comparator": "="
    }
  },
  {
    "type": "number",
    "number": "10",
    "name": "Stock"
  }
]
```

Each row of the panel should show:
* the label `Name:`
* the name in a text input
* the label `Value:`
* the value, either a `FactorioIcon` or a constant number
* a checkbox ticked or unticked, then the label `Parameter`
* if the value was a constant number, then:
  * the label `Variable:`
  * a text input with the variable
  * a checkbox ticket or unticked, then the label `Formula:`
  * a text input with the formula
* otherwise if the value was an icon
  * the label `Ingredient of:`
  * the `FactorioIcon` of the parameter that it's an icon of, which is like a number of a previous row
  * a label of the number, like `#1`

When parameters are present, the usesParameters flag in metadata should be set to true.

Parameter IDs can be referenced elsewhere in the blueprint, particularly in:
- Recipe fields as "parameter-0", "parameter-1", etc.
- Circuit conditions
- Other settings that accept signals or recipes

### Json panel

Third panel on the right. This panel is only displayed when there is a selected blueprint.

The panel shows these action buttons:
- Button to copy-to-clipboard the data for the root blueprint
- Button to copy-to-clipboard the data for the selected blueprint
- Button to display a panel for the json of the root blueprint
- Button to display a panel for the json of the selected blueprint
- Button to download the json of the root blueprint
- Button to download the json of the selected blueprint

The download buttons should download the json as a file with the name like &lt;label&gt;.json if the label is available. If the label is not available for the selected blueprint, but is available at the root, then the file should be named &lt;root label&gt;-&lt;path&gt;.json. The path is a dot-separated list of child indexes starting at 1. For example, 1.2 means the root blueprint's first child's second child.

When generating filenames:
- Remove invalid filename characters from labels
- Replace spaces with hyphens
- If no label is available, use "blueprint" as the default

## General panel requirements

These requirements apply to all panels.

### Version number parsing

Game versions are embedded in blueprints as 64-bit numbers. They need to be split into 4 chunks of 16-bits each, and then turned into a four-part version number like 1.2.3.4.

Due to JavaScript's number precision limitations with large integers, the version must be converted from a number to a BitInt before splitting into chunks.

For example, the version number 562949954076673 should parse to "2.0.10.1" and requires BigInt operations to parse correctly.

### Icons and URLs

All game icons (items, entities, recipes, etc.) should be loaded from factorio.school. The URL format is:
```
https://www.factorio.school/icons/{type}/{name}.png
```

Icon types:
- item
- entity
- recipe
- fluid
- technology
- virtual-signal (used when type is "virtual")
- achievement
- tile

Special cases:
- When a type is not specified in blueprint data, assume "item"
- When type is "virtual", use "virtual-signal" in the URL path

Example usages:
- Entity: `<img src="https://www.factorio.school/icons/entity/assembling-machine-3.png">`
- Recipe: `<img src="https://www.factorio.school/icons/recipe/coal-liquefaction.png">`
- Item with missing type: `"signal": { "name": "space-platform-starter-pack" }` → `icons/item/space-platform-starter-pack.png`
- Virtual signal: `"type": "virtual"` → use `icons/virtual-signal/` path

### Rich Text

The attachment `factorio-rich-text.txt` contains the information from the Factorio wiki about rich text and can be considered a specification for how to parse and display rich text.

All blueprint labels and descriptions can contain rich text. We should parse the rich text and display it in a readable format. For example, `[color=blue][font=default-bold]example[/font][/color]` should display as "example" in blue and bold.

Images, like `[item=red-wire]` should become img tags with the appropriate image, like `<img src="https://www.factorio.school/icons/item/red-wire.png">`.

The Factorio is somewhat out of date. There are additional icons supported now in rich text including quality and planets.

`[quality=legendary][quality=epic][quality=rare][quality=uncommon][quality=normal]`
`[planet=fulgora]`

### Game features

The blueprint uses elevated rails if it uses any of these entities:

- elevated-curved-rail-a
- elevated-curved-rail-b
- elevated-half-diagonal-rail
- elevated-straight-rail
- rail-ramp
- rail-support

- The blueprint uses Factorio 2 if it uses any elevated rails or any of these entities.

- curved-rail-a
- curved-rail-b
- half-diagonal-rail

## Tech Stack

### UI Framework

Start the project with the vite template for ts-preact.

Use TanStack/router for routing.

## State Management

Use Signals for state management.

Use https://github.com/jakearchibald/idb-keyval for IndexedDB storage.

Use Signal effects for storing and retrieving data from IndexedDB.

The schema of data in storage will be.

```typescript
export type DatabaseBlueprintType = 'blueprint' | 'blueprint_book' | 'upgrade_planner' | 'deconstruction_planner'

export interface DatabaseBlueprintIcon {
    type?: string  // Defaults to 'item' if not specified
    name: string
}

export interface DatabaseBlueprint {
    // Storage metadata
    createdOn: number
    lastUpdatedOn: number

    // Raw data
    data: string           // The raw blueprint string

    // Parsed metadata
    type: DatabaseBlueprintType
    label?: string
    description?: string
    gameVersion: string    // Parsed from version number
    icons: DatabaseBlueprintIcon[] // 0-4 icons

    // Mod feature usage
    usesSpaceAge: boolean
    usesQuality: boolean
    usesElevatedRails: boolean
}
```

### CSS

The style should be consistent with the video game menus, and https://factorio.com/. The CSS from factorio.com is in the attachment `factorio.css`. The attachment `Factorio.html` is the html content of factorio.com and should help with context about how CSS is applied to elements.

Since we are trying to closely copy factorio.com's style, we will use similar element structure and identical class names as theirs.

### Code Style

* Comments go above the code they describe, never at the end of a line
* Always use semi-colons

## Query Parameters

### data

The `data` query parameter allows users to directly input a blueprint string. When provided, the application will process and display the blueprint without requiring any additional input from the user.

### json

The `json` query parameter allows users to input a JSON representation of a blueprint. When provided, the application will process and display the blueprint based on the JSON data.

### source

The `source` query parameter allows users to provide a URL from which the blueprint can be fetched. The application will fetch the blueprint from the provided URL and display it.

### selection

The `selection` query parameter takes a "path" like `1.2.3`, which is interpreted to mean selecting the root book's first child's second child's third child. The assumption is that the book is deep enough, that the root, its first child, and that second child are all books. The end of the path can be anything, a book, blueprint, upgrade planner, or deconstruction planner. If the path isn't valid but the blueprint is valid, the selection is dropped. The empty path means the root is selected.

When users click items in the blueprint tree, the URL updates with the new selection.

If the `selection` path is invalid, the application handles it gracefully by dropping the selection and continuing to display the root blueprint as the selection.

## Plan

Phase 1: Project Setup

* Create new project using Vite template for TypeScript + Preact
  * `npm create vite@latest factorio-blueprint-playground -- --template preact-ts`
* Set up dependencies
  * `npm install idb-keyval @preact/signals fflate @tanstack/router @tanstack/react-router`
  * `npm install -D @tanstack/router-devtools`
* Get rid of unnecessary template files and stuff in index.html
  * rm src/app.tsx
  * rm src/app.css
  * rm src/index.css
  * rm public/vite.svg
  * rm src/assets/preact.svg
* Set up the router configuration
  * https://tanstack.com/router/latest/docs/framework/react/quick-start#configure-the-vite-plugin
  * https://tanstack.com/router/latest/docs/framework/react/devtools
    * src/routes/__root.tsx
      * Check import.meta.env.PROD
      * Lazy load TanStackRouterDevtools
  * / for the main blueprint playground
    * createLazyFileRoute
    * BlueprintPlayground component
  * /history to view and manage blueprint history
    * Also createLazyFileRoute
    * History component
* Set up development tooling
  * Add justfile for common commands
  * Add dump-tree command to make it easier to work with LLMs
  * Turn on StrictMode
* Signals and IndexedDB storage
  * Types for stored blueprints in src/storage/blueprints.ts
  * Date.now() as the indexdb key
  * blueprintStorage methods add, update, get, remove, list, which delegate to idb-keyval's set, set, get, del, and entries respectively.
* Add development tooling
  * Configure Vitest for testing
  * Add test setup with jsdom and testing-library
* Set up GitHub Actions
  * Add pull request workflow for testing and building

Phase 2: Core Blueprint Parsing

* Read example blueprints and write typescript types for deserialized blueprints in src/parsing/types.ts
* Deserialize a blueprint to JSON
* Serialize a blueprint from JSON
* Add compression settings matching Factorio's requirements

```typescript
export interface CompressionSettings {
  level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;  // 0 = no compression, 9 = max compression
  mem?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;  // Memory level (more = faster)
}
```

* Add BlueprintWrapper class for unified blueprint handling
* Add comprehensive testing for blueprint parsing
  * Blueprint roundtrip tests
  * Compression settings tests
  * Parser edge case tests
* Add version number parsing utility
* Add path-based blueprint extraction for books

Phase 3: Basic UI Implementation

* Create components that match Factorio.com style
  * panel
  * inset-dark
  * inset-light
  * background (for the entire page) that panels float on top of
  * button-green-right
  * button-red
  * plain gray rectangle buttons
* Use the basic components in the placeholder routes for the main page and history page
* Implement header with blueprint input textarea
* Ability to dismiss/close panels
* Add URL-based blueprint loading
  * Support direct blueprint strings in URL
  * Support factorio.school and factorioprints.com URLs

Phase 4: Panel Implementation (Left Side)

* Implement version number component
* Implement Factorio Icon component
  * Support old icon types (item, fluid, virtual-signal, etc.) and new icon types (planet, space-location, quality, etc.)
  * Add quality overlay support, where the quality icon is displayed at 66% scale on the bottom left of the main icon.
  * Serve icons from local public directory
* Implement Rich Text component
  * Add JSX tests
* Implement Basic Information panel
* Implement Blueprint Tree panel
  * Support recursive blueprint book structure
  * Add visual hierarchy with indentation
  * Support blueprint selection
  * Add separators between blueprint type, blueprint's 4 icons, and label
  * Optimize rendering with memoization

Phase 5: Panel Implementation (Right Side)

* Implement Summary panel
* Implement Contents panel
  * Add table-like component system with Spreadsheet, Row, and Cell
  * Support item counting and sort the table by counts
  * Support quality, with each entity/quality pair appearing on its own row
* Implement Upgrade Planner panel
  * Add support for quality parameters
  * Add mapping visualization, with from, arrow, and to in 3 Cells
* Implement Deconstruction Planner panel
* Implement Parameters panel
* Implement JSON panel with copy/download functionality
* Implement JSON panels with copy/download functionality
  * One panel for root blueprint, and one for selected blueprint
  * There is always a selected blueprint, even if it's the root blueprint that was just pasted, or the only blueprint
  * Support Copy String, Copy JSON, and Download String

Phase 6: Advanced Features

* Add game feature detection (elevated rails, etc.)
* Implement routes, so we can add another page
* Add blueprint history tracking
* Implement history component
  * Remove from history
  * Download history as blueprint book

Phase 7: Polish & Optimization

* Add loading states
* Implement error handling UI
* Add animations for panel expansion
* Optimize performance
* Add tests
* Add documentation
