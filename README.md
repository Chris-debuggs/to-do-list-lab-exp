# To-Do List Lab Exp

A robust, modern React-based To-Do List application built with Vite and TypeScript. This project serves as an experimental laboratory for applying advanced web development techniques, state management, and running machine learning models directly in the browser.

## Key Features

- **Modern Architecture**: Built with React 18, Vite, and strict TypeScript.
- **Robust State Management**: Utilizes `useReducer` for predictable, decoupled state updates and logic purity.
- **Asynchronous Persistence**: Abandons synchronous `localStorage` in favor of IndexedDB (`idb`) for resilient, non-blocking data storage.
- **In-Browser Machine Learning**: Integrates `@xenova/transformers` running in a Web Worker to perform complex capabilities completely client-side without degrading UI performance.
- **Comprehensive Testing**: Fully tested using Vitest and React Testing Library (`@testing-library/react`).
- **Automated CI/CD**: Configured with GitHub Actions to automatically test and deploy to GitHub Pages.

## Tech Stack

- **Framework**: React (v18)
- **Tooling**: Vite, TypeScript
- **Storage**: IndexedDB (via `idb` wrapper)
- **ML/AI**: Transformers.js (`@xenova/transformers`)
- **Testing**: Vitest, React Testing Library, JSDOM
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm (or your preferred package manager)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd to-do-list-lab-exp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Start the Vite development server:

```bash
npm run dev
```

### Building for Production

To create a production build and preview it:

```bash
npm run build
npm run preview
```

## Testing

Run the Vitest test suite to ensure application logic purity:

```bash
npm run test
```

For linting:

```bash
npm run lint
```

## Deployment

Continuous Integration and Deployment (CI/CD) is automated via GitHub Actions. Pushing to the main branch triggers the deployment workflow, which runs tests, builds the application, and deploys the static bundle to GitHub Pages.
