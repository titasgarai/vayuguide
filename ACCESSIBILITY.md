# Accessibility Statement & Audit — VayuGuide

VayuGuide is engineered to adhere to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards, ensuring complete keyboard, screen reader, and low-vision accessibility.

---

### 1. WAI-ARIA Combobox Keyboard Pattern (`CityAutocomplete.tsx`)
* **Combobox Role:** The search input defines `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, and `aria-controls`.
* **Active Descendant:** When suggestions open, `aria-activedescendant` points to the focused option (`${id}-opt-${activeIndex}`).
* **Keyboard Navigation:**
  * `ArrowDown`: Moves highlight to next option; wraps cleanly from last to first option.
  * `ArrowUp`: Moves highlight to previous option; wraps cleanly from first to last option.
  * `Enter`: Commits the active suggestion.
  * `Escape`: Dismisses the dropdown list and clears focus state.
* **Option Marking:** Dropdown items define `role="option"` with dynamic `aria-selected={idx === activeIndex}`.

---

### 2. WAI-ARIA Roving Tabs Pattern (`page.tsx`)
* **Tablist & Tabs:** The view mode switcher implements `role="tablist"` with individual `role="tab"` buttons referencing their respective `role="tabpanel"` containers.
* **Roving Tabindex:** Active tabs hold `tabIndex={0}`, while inactive tabs hold `tabIndex={-1}`.
* **Keyboard Control:** Pressing `ArrowRight`/`ArrowDown` or `ArrowLeft`/`ArrowUp` shifts focus and selects the alternate tab. `Home` jumps to the first tab; `End` jumps to the last tab.

---

### 3. Collision-Free Form Identifiers via `React.useId()`
* **Component Extraction:** Persona selection, activity inputs, and air purifier toggles are consolidated into `src/frontend/components/ProfileFields.tsx`.
* **Unique Scoping:** Every `<label htmlFor={...}>` and `<input id={...}>` is paired using `React.useId()`, guaranteeing zero HTML ID collisions even when Single mode, Profile A, and Profile B are simultaneously present in the DOM.

---

### 4. Semantic Landmarks & Skip Navigation
* **Skip Link:** A persistent skip link (`<a href="#main-content">`) is positioned as the first focusable element in `src/app/layout.tsx`, becoming visible on keyboard focus (`focus:not-sr-only`).
* **Landmark Structure:** Top-level content is enclosed within `<main id="main-content">`, accompanied by `<header>`, `<section>`, and `<article>` tags.

---

### 5. Dynamic Live Regions (`aria-live`)
* **Live Telemetry & Plans:** Result containers specify `aria-live="polite"` with `aria-busy={isLoading}`, allowing screen readers to announce new recommendations upon query resolution.
* **Error Notifications:** Form and network error messages specify `role="alert" aria-live="assertive"`.

---

### 6. Visual Contrast & Focus Indicators (WCAG 2.4.7)
* **High-Contrast Focus Rings:** All interactive elements feature `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15502E] focus-visible:ring-offset-1`, ensuring at least a 3:1 contrast ratio against light backgrounds.
