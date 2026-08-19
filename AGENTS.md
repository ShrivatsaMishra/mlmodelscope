# ML Model Scope

ML Model Scope is a web application for running AI/ML models
and displaying their predictions and explanations.

## Architecture

- Frontend: React / Node.js
- Backend: API services
- Preserve existing architecture and conventions.
- Inspect existing implementations before introducing new abstractions.

## Development rules

- Do not make large architectural changes without first proposing them.
- Prefer small, reviewable changes.
- Reuse existing components and patterns.
- Do not expose API credentials in frontend code.
- Run existing tests/lint/type checks after changes.
- Do not modify unrelated code.

## AI Explanation Feature

We are developing an interactive "Explain this" capability for
model results.

The explanation system should eventually support:
- text and token results
- structured predictions
- images
- heatmaps
- charts
- spectrograms
- other visualizations

The explanation backend will use a multimodal Gemini Flash model.

Gemini credentials must remain server-side.

Do not assume the implementation architecture. Inspect the
existing code before proposing changes.
