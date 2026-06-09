export const CHROMA_KEY_COLOR = "#ff00ff";

const sharedComicStyle = `
Style:
Cute hand-drawn manga food doodle, more cartoon-like than realistic. Use simplified rounded shapes, playful proportions, and a soft sticker-like silhouette. The subject should feel like a charming comic prop from a cozy recipe manga, not a realistic photo.

Linework:
Use clear dark chocolate-brown ink outlines, slightly thicker and more expressive than delicate sketch lines. Keep the contour hand-drawn, gently wobbly, and lively. Add a few simple inner contour lines only where needed; avoid dense realistic texture lines.

Color and rendering:
Use flat-to-soft watercolor/gouache colors with gentle cel-shaded areas. Keep colors muted, warm, and cute, but avoid realistic surface rendering. Add small white comic highlight strokes, simple blush-like color accents, sparse dotted texture, and tiny decorative speckles. Shading should be minimal, low-detail, and graphic.

Background:
Perfectly flat solid ${CHROMA_KEY_COLOR} chroma-key background for later background removal. The background must be one uniform color with no texture, no gradient, no shadow, no floor plane, and no lighting variation.
Use the literal pure RGB color #FF00FF only for the background, not pink, purple, fuchsia, gradients, or any approximate shade.
`.trim();

const sharedConstraints = `
Constraints:
No text, no label, no watermark, no cast shadow. Avoid realistic photography, realistic anatomy, realistic meat fibers, realistic plant veins, detailed botanical rendering, 3D render, vector icon style, glossy plastic look, dramatic lighting, and high-detail textures. Do not use ${CHROMA_KEY_COLOR} anywhere in the subject.
`.trim();

export function buildIngredientImagePrompt(name: string) {
  return `
Create a standalone ingredient illustration: ${name}, in a cozy kawaii Japanese comic food illustration style.

${sharedComicStyle}

Composition:
One centered ingredient only, floating as a clean cutout, generous padding on all sides, 512x512 px square canvas. The silhouette should read clearly at small icon size.

${sharedConstraints}
No plate, no tray, no character.
`.trim();
}

export function buildDishImagePrompt(name: string, summary: string) {
  return `
Create a standalone finished dish illustration: ${name}, in a cozy kawaii Japanese comic food illustration style.

Dish context:
${summary}

${sharedComicStyle}

Composition:
One centered finished dish only, floating as a clean cutout, generous padding on all sides, 512x512 px square canvas. The silhouette should read clearly at small card and history thumbnail size. Show the prepared dish as a compact comic food prop, not a restaurant photo.

${sharedConstraints}
No plate, no tray, no utensils, no table, no character, no packaging.
`.trim();
}
