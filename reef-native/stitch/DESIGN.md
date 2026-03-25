# Design System Strategy: The Fluid Ecosystem

## 1. Overview & Creative North Star
The creative North Star for this design system is **"The Digital Reef."** 

Much like its biological namesake, this system is characterized by organic fluidity, vibrant life, and hidden depth. We move away from the rigid, "boxed-in" nature of traditional fintech to create an editorial experience that feels breathable and alive. The interface isn't just a tool; it’s an immersive environment where high-tech efficiency meets organic softness. 

We break the "template" look by utilizing:
*   **Intentional Asymmetry:** Using organic wave patterns (inspired by the 'Reef' orb) to lead the eye diagonally across the screen.
*   **Breathable Scale:** High-contrast typography where display headings feel like art pieces, separated by generous whitespace.
*   **Dynamic Depth:** Elements don't sit *on* the background; they float within it, utilizing glassmorphism and light-based shadows.

## 2. Colors: Tonal Vibrancy
Our palette is a sophisticated blend of deep galactic purples and high-energy magentas, anchored by a "clinical" clean white to ensure accessibility.

### The Palette
*   **Primary (`#4e00cd`):** The core of the system. Use for high-action focal points.
*   **Secondary (`#b70054`):** The vibrant energy. Use for accents and the "glow" in gradients.
*   **Tertiary (`#004d5a`):** A grounding deep teal for specialized data visualization.
*   **Surface/Background (`#fff7fe`):** A warm, tinted white that feels more premium and intentional than pure `#ffffff`.

### Design Rules
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background creates a clear but soft distinction without visual clutter.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of physical layers. Use `surface-container-lowest` for the base and `surface-container-highest` for the most prominent floating cards.
*   **The "Glass & Gradient" Rule:** Main CTAs must use a signature gradient (e.g., `primary` to `secondary`) rather than flat fills. Use backdrop-blur (12px-20px) on semi-transparent surfaces to create "frosted glass" windows that let the organic background patterns bleed through.

## 3. Typography: Editorial Authority
The typography system uses **Plus Jakarta Sans** for high-impact display moments and **Inter** for utility and body content.

*   **Display & Headline (Plus Jakarta Sans):** These are the "voice" of the brand. Use `display-lg` (3.5rem) for hero statements with tight letter-spacing (-2%). The goal is a bold, editorial look that feels expensive.
*   **Title & Body (Inter):** Focused on legibility. Use `title-md` (1.125rem) for card headings and `body-md` (0.875rem) for general information.
*   **Label (Inter):** Small, all-caps or high-weight styles for micro-copy and metadata, ensuring every piece of data has a clear hierarchy.

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "3D boxes"; we use light to create "atmosphere."

*   **The Layering Principle:** Stack `surface-container` tiers to create natural lift. A card should be one tier higher than the section it sits on.
*   **Ambient Shadows:** For floating elements (like the 'Plus' FAB in the mobile view), use extra-diffused shadows.
    *   *Shadow Recipe:* `0px 20px 40px rgba(78, 0, 205, 0.08)`. Notice the shadow is tinted with the `primary` color, not grey.
*   **The "Ghost Border" Fallback:** If a container requires more definition, use a "Ghost Border": the `outline-variant` token at 15% opacity. It should be felt, not seen.
*   **Glassmorphism:** Apply to navigation bars and floating modals. Use a `surface` color with 70% opacity and a `20px` backdrop blur to maintain depth and connection to the organic patterns underneath.

## 5. Components: Fluid Primitives

### Buttons
*   **Primary (Gradient):** Vibrant Pink-to-Purple (`secondary` to `primary`). 
    *   *Shape:* Fully rounded (`9999px`). 
    *   *Effect:* Subtle outer glow on hover using the button’s own color.
*   **Secondary (Ghost):** `outline-variant` at 20% with `primary` text.
*   **Tertiary (Text):** `primary` text, no background.

### Chips
*   Used for "Tokens", "Bonds", and "NFTs". Active state should use the signature "Orb Glow" (a soft, blurred radial gradient background) rather than a flat color block.

### Input Fields
*   **Base:** `surface-container-lowest` with a "Ghost Border."
*   **Focus State:** The border opacity increases to 100%, and a very soft `primary` glow (4px blur) emanates from the field.

### Cards & Lists
*   **Rule:** No divider lines. Use `8px` of vertical white space (from the Spacing Scale) or a shift from `surface` to `surface-container-low` to separate items.
*   **List Item:** Leading elements (icons) should sit in a circular glass container with a 4% `primary` tint.

### The "Orb" FAB (Floating Action Button)
*   A custom component inspired by the 'Reef' orb. A large, circular gradient button with a high-intensity white icon and an ambient glow that matches the `secondary` color.

## 6. Do’s and Don’ts

### Do
*   **Do** use organic, wave-like background patterns in the top-right and bottom-left of screens to frame the content.
*   **Do** use asymmetrical layouts—shift content slightly off-center to create a modern, curated feel.
*   **Do** prioritize whitespace. If a screen feels crowded, increase the spacing token by one level (e.g., from `16` to `20`).

### Don't
*   **Don't** use pure black (`#000000`) for text. Use `on-surface` (`#2c024d`) to maintain the deep purple tonal harmony.
*   **Don't** use hard, 90-degree corners. Everything must adhere to the Roundedness Scale (Default `1rem`).
*   **Don't** use standard "drop shadows." If a component doesn't look like it's glowing or floating in a liquid environment, the shadow is too heavy.