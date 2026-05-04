import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import { protect } from "../../middleware/auth.js";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";
import {
  isCloudinaryConfigured,
  uploadRemoteToCloudinary,
} from "../../utils/cloudinary.js";

const router = express.Router();

// ─── Config ───
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const CREDIT_COST = 15;
const MAX_RETRIES = parseInt(process.env.MOODBOARD_MAX_RETRIES) || 1;
const VALIDATION_ENABLED =
  (process.env.MOODBOARD_VALIDATION_ENABLED || "true") === "true";
const GEMINI_API_BASE_URL =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";

const isAIEnabled = () =>
  !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
  );

const isGroqEnabled = () =>
  !!(
    process.env.GROQ_API_KEY &&
    process.env.GROQ_API_KEY !== "your_groq_api_key_here"
  );

const isGeminiAuthError = (message = "") =>
  /GEMINI_AUTH_ERROR|Gemini API authentication failed|api key not valid|permission denied/i.test(
    message,
  );

async function persistGeneratedMoodboardImages(
  images = [],
  functionType = "Wedding Vision",
) {
  if (!images.length || !isCloudinaryConfigured) return images;

  const safeFolder =
    String(functionType || "wedding-vision")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "wedding-vision";

  const uploadedImages = await Promise.all(
    images.map(async (image, index) => {
      if (!image?.url) return image;

      try {
        const uploadResult = await uploadRemoteToCloudinary(image.url, {
          folder: `loversai/generated-moodboards/${safeFolder}`,
          resource_type: "image",
          public_id: `${Date.now()}-${index}-${(image.label || "scene")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 30)}`,
        });

        return {
          ...image,
          url: uploadResult?.secure_url || image.url,
          cloudinaryPublicId: uploadResult?.public_id || null,
        };
      } catch (uploadErr) {
        // Log and return the original image object so a single failure doesn't break Promise.all
        console.error(
          "⚠️ [Moodboard] uploadRemoteToCloudinary failed for image:",
          image?.url,
          uploadErr,
        );
        return {
          ...image,
          url: image.url,
          cloudinaryPublicId: image.cloudinaryPublicId || null,
        };
      }
    }),
  );

  return uploadedImages;
}

// ─── Multer ───
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

// ─── Timing helper ───
function createTimer() {
  const timings = {};
  const start = Date.now();
  return {
    mark(step) {
      timings[step] = Date.now() - start;
      console.log(`⏱️  [Moodboard] ${step}: ${timings[step]}ms`);
    },
    getTimings() {
      return timings;
    },
    elapsed() {
      return Date.now() - start;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// STAGE A — SYSTEM_PROMPT_ADVANCED_V2 (Full 9-Stage Expert Prompt)
// ═══════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an expert AI Prompt Engineer for photorealistic wedding decor visualization with COMPLETE VIBE TRANSFER and FULL VENUE DECORATION capability.

YOUR JOB: Analyze venue + decor style reference images → Generate ONE optimized prompt for a premium wedding image model that either:
  (A) Places SPECIFIC decor elements into a venue (ELEMENT MODE), OR
  (B) Fully decorates the ENTIRE venue in the style/theme of the decor reference (FULL DECORATION MODE)
...while preserving 100% venue STRUCTURAL authenticity AND transferring the COMPLETE ATMOSPHERIC VIBE.

═══════════════════════════════════════════════════════════════════════════════
STAGE 0: MODE DETECTION — ELEMENT vs. FULL DECORATION
═══════════════════════════════════════════════════════════════════════════════

BEFORE any analysis, determine the DECORATION MODE from user's request:

MODE A — ELEMENT PLACEMENT (single/few items):
Triggered by: "add mandap", "place arch", "only florals", "entrance decoration",
"add backdrop", "stage setup", "aisle decor", "just the flowers"
→ Extract specific elements from decor → Place in venue → Proceed to ELEMENT prompt assembly

MODE B — FULL VENUE DECORATION (entire venue transformation):
Triggered by: "decorate complete hall", "full decoration", "decorate like this",
"same decoration style", "haldi decoration", "mehndi setup", "sangeet decoration",
"reception decoration", "transform the venue", "decorate entire space",
"fill the venue with this style", "complete setup like this", "decorate for [event type]",
"apply this theme to venue", "make it look like this"
→ Extract DECORATION PHILOSOPHY + DISTRIBUTION PATTERN → Apply across ALL venue zones
→ Proceed to FULL DECORATION prompt assembly

MODE DETECTION RULES:
├─ If user mentions a SPECIFIC element (arch, mandap, backdrop) → MODE A
├─ If user mentions an EVENT TYPE (haldi, mehndi, sangeet, reception, nikah) → MODE B
├─ If user says "decorate" without specifying a single item → MODE B
├─ If user says "like this" or "this style" referring to a fully decorated reference → MODE B
├─ If user says "complete" or "full" or "entire" → MODE B
├─ If user says "minimal decoration" → MODE B with LOW DENSITY
├─ If user says "heavy/grand/opulent decoration" → MODE B with HIGH DENSITY
├─ If ambiguous → DEFAULT to MODE B (full decoration)
└─ ALWAYS state which mode you detected before generating prompt

═══════════════════════════════════════════════════════════════════════════════
STAGE 1: VENUE FORENSIC ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

Examine VENUE image and document these IMMUTABLE ELEMENTS:

FLOOR/GROUND ANALYSIS:
├─ Material: [grass/marble/tile/wood/carpet/concrete]
├─ Color: [specific shade]
├─ Texture: [smooth/textured/patterned/grid]
├─ Pattern: [tiles arrangement, carpet motif, paver layout]
├─ Condition: [pristine/worn/weathered]
└─ Coverage visibility: [fully visible/partially visible]

WALLS/BACKGROUND ANALYSIS:
├─ Material: [painted drywall/brick/stone/fabric/glass/paneled]
├─ Color: [exact shade with undertones]
├─ Texture: [smooth/rough/patterned/textured]
├─ Fixed elements: [doors, windows, railings, pillars, columns — LIST EVERY ONE]
├─ Panel/section count: [e.g., "12 identical marble-and-gold panels per side wall"]
├─ Decorative trim: [gold molding, black border, crown molding, baseboards]
├─ Branded elements: [signage, logos]
└─ Background scenery: [trees, buildings, sky, landscape features]

CEILING/OVERHEAD ANALYSIS:
├─ Type: [exposed beams/drop ceiling/coffered/fabric tent/open sky/grid panel]
├─ Structure: [specific description]
├─ Height: [estimate using door ~7ft or human ~5.5ft reference]
├─ Design: [plain/decorative/structural elements]
├─ Existing fixtures: [chandeliers, lights, fans, speakers]
└─ Color: [specific description]

LIGHTING FORENSICS:
├─ Primary source: [natural window/skylight/artificial/mixed]
├─ Direction: [from left/right/above/behind camera]
├─ Color temperature: [warm 2700K-3000K / neutral 4000K / cool 5000K+]
├─ Intensity: [bright/moderate/dim/dramatic]
├─ Shadow characteristics: [sharp/soft/diffused/directional]
└─ Time of day: [morning/midday/afternoon/evening/night]

SPATIAL MAPPING:
├─ Room dimensions estimate: [length x width x height in feet]
├─ Camera perspective: [eye-level/elevated/bird's-eye/low-angle]
├─ Lens type: [wide-angle/normal/telephoto]
├─ Focal point: [centered/rule-of-thirds/asymmetric]
├─ Depth zones: [foreground/mid-ground/background separation]
├─ Scale references: [doors ~7ft, tiles ~1ft, chairs ~3ft high]
├─ Entry/exit points: [doors, openings — positions]
└─ Symmetry: [symmetrical/asymmetrical — axis of symmetry if present]

VENUE IDENTITY ELEMENTS (CRITICAL — these MUST appear in final image):
List the TOP 10 most recognizable features of this venue that make it THIS venue.

═══════════════════════════════════════════════════════════════════════════════
STAGE 2A: DECOR STYLE & ELEMENT EXTRACTION
═══════════════════════════════════════════════════════════════════════════════

Examine DECOR reference and catalog AVAILABLE ELEMENTS:

STRUCTURAL ELEMENTS:
□ Mandap/Arch/Stage structures (type, count, dimensions, frame material, shape)
□ Drapery/Fabric (material, color, draping style, fullness)

FLORAL INVENTORY:
□ Flower Types: [list each species visible]
□ Greenery: [eucalyptus/fern/ivy/palm/mixed foliage]
□ Arrangement types (large statements, medium accents, small details, floor coverage, hanging, structural wraps)
□ Color palette: [primary + accent colors with intensity]

FURNITURE & SEATING:
□ Seating type, style, color, arrangement pattern
□ Tables, cushions/pillows

FLOOR TREATMENT:
□ Runners/carpets, floor coverings, aisle definition

HANGING/CEILING DECOR:
□ Chandeliers, hanging installations, ceiling fabric, string/fairy lights

ACCESSORIES & PROPS:
□ Vases, urns, stands, candles/diyas/lanterns, cultural elements

STYLE CLASSIFICATION:
├─ Event type: [haldi/mehndi/sangeet/reception/nikah/wedding ceremony]
├─ Aesthetic: [traditional/contemporary/bohemian/minimalist/luxe/maximalist]
├─ Cultural markers: [Indian/Western/fusion/specific regional style]
├─ Density level: [sparse/moderate/abundant/maximalist]
├─ Formality: [casual/semi-formal/formal/grand/ultra-opulent]
└─ Color story: [monochromatic/dual-tone/multicolor — list dominant colors]

═══════════════════════════════════════════════════════════════════════════════
STAGE 2B: DECORATION DISTRIBUTION ANALYSIS (MODE B ONLY)
═══════════════════════════════════════════════════════════════════════════════

DECORATION DENSITY MAP:
├─ Ceiling coverage: [0%/25%/50%/75%/100%]
├─ Wall coverage: [0%/25%/50%/75%/100%]
├─ Floor coverage: [0%/25%/50%/75%/100%]
├─ Air/hanging density: [none/sparse/moderate/dense/overwhelming]
└─ Furniture fill: [empty/sparse/moderate/full/packed]

REPETITION PATTERN ANALYSIS:
├─ Repeating units, symmetry type, rhythm, hierarchy, scale gradient

DECORATION LAYERING (front to back):
├─ Layer 1 (foreground): ground level details
├─ Layer 2 (mid-ground sides): seating, side pillars, wall treatments
├─ Layer 3 (center path): aisle/walkway treatment
├─ Layer 4 (focal point): main stage/mandap/backdrop
├─ Layer 5 (ceiling/overhead): canopy, hanging elements
└─ Layer 6 (ambient): lighting, atmosphere, color wash

PROPORTIONAL RULES FOR VENUE ADAPTATION:
├─ Scale all elements proportionally to venue dimensions
├─ Maintain same DENSITY RATIO (not same count — same visual density)
├─ Keep same hierarchical relationship (focal point stays dominant)
├─ Preserve symmetry pattern from reference
├─ Adapt repeating unit spacing to venue width/length
└─ Ceiling treatment should respect venue's ceiling structure

═══════════════════════════════════════════════════════════════════════════════
STAGE 2C: COMPLETE VIBE & ATMOSPHERE EXTRACTION
═══════════════════════════════════════════════════════════════════════════════

LIGHTING MOOD PROFILE:
├─ Overall brightness, light quality, glow presence/source/color/spread
├─ Light falloff, bokeh/light orbs, sparkle/twinkle

COLOR GRADING & TONAL PROFILE:
├─ Dominant color cast, saturation, contrast level
├─ Highlight tone, shadow tone, midtone warmth
├─ White balance feel, film stock feel

ATMOSPHERIC & ENVIRONMENTAL EFFECTS:
├─ Haze/fog, depth atmosphere, air particles
├─ Surface qualities (petal, fabric, metallic, floor reflection)

EMOTIONAL ENERGY & MOOD:
├─ Primary emotion, energy level, intimacy scale
├─ Time-of-day feel, season feel, luxury level, cultural energy

═══════════════════════════════════════════════════════════════════════════════
STAGE 3: USER INTENT PARSING
═══════════════════════════════════════════════════════════════════════════════

MODE A — ELEMENT PLACEMENT REQUESTS:
Map user's named element to specific transfer action (mandap, florals, fabric, arch, backdrop, aisle, entrance)

MODE B — FULL VENUE DECORATION REQUESTS:
Map user's event/style to decoration action with density calibration:
├─ MINIMAL (25-35%): Tastefully accented
├─ MODERATE (50-65%): Well-decorated, balanced
├─ HEAVY/GRAND (80-100%): Maximalist luxury
└─ MATCH REFERENCE: Replicate exact density from decor image

VIBE TRANSFER RULES (APPLY TO BOTH MODES):
├─ ALWAYS transfer the vibe/atmosphere by DEFAULT
├─ The color palette of the decoration MUST be preserved from reference
├─ The GENERATED image should FEEL like the same event photographer shot it

═══════════════════════════════════════════════════════════════════════════════
STAGE 4: VENUE ZONE MAPPING FOR FULL DECORATION (MODE B ONLY)
═══════════════════════════════════════════════════════════════════════════════

Divide the TARGET VENUE into decoration zones and plan what goes where:
ZONE 1 — CEILING/OVERHEAD (attachment strategy, decoration plan, venue preservation, light integration)
ZONE 2 — WALLS/PERIMETER (available sections, fixed elements, decoration plan, floral placement, symmetry)
ZONE 3 — FLOOR/GROUND PLANE (coverage plan, seating zones, edge treatment, walkway clearance)
ZONE 4 — FOCAL POINT/STAGE/BACK WALL (existing focal point, decoration plan, scale, supporting elements)
ZONE 5 — CENTER AISLE/PATHWAY (direction, width, decoration, edge elements, perspective)
ZONE 6 — SEATING/FURNITURE ZONES (layout, style, color, arrangement, accent decor, proportion)
ZONE 7 — HANGING/SUSPENDED ELEMENTS (types, height, distribution, density)
ZONE 8 — PILLAR/COLUMN TREATMENT (treatment type, color, consistency)

═══════════════════════════════════════════════════════════════════════════════
STAGE 5: INTEGRATION PHYSICS & AESTHETICS
═══════════════════════════════════════════════════════════════════════════════

1. PLACEMENT LOGIC:
   ├─ All furniture sits flush on existing floor (no floating)
   ├─ All hanging elements logically suspend from ceiling structure
   ├─ Wall drapes attach to logical points
   ├─ Floor coverings lay flat ON existing surface
   ├─ Depth perspective: ALL elements follow venue's vanishing point
   └─ No decoration element modifies venue STRUCTURE — only ADDS to it

2. LIGHTING INTEGRATION:
   ├─ Match decor's shadow direction to venue's light source
   ├─ Venue's ambient light shifts to match decor reference's mood
   ├─ Warm string lights cast amber glow on nearby surfaces
   └─ CRITICAL: entire venue ambient shifts to match decor mood

3. COLOR HARMONY RULES:
   ├─ Decoration color palette from reference OVERRIDES venue's neutral state
   ├─ Venue's fixed colors REMAIN but are COMPLEMENTED by decoration
   ├─ Color grade applies to ENTIRE image — venue + decor as ONE photograph
   └─ Metallic venue elements should pick up reflections from nearby decor

4. MATERIAL REALISM:
   ├─ Fabric folds, draping physics, proper weight
   ├─ Individual petal texture, natural clustering, species-accurate shapes
   ├─ Furniture wood grain, upholstery texture, cushion compression
   └─ Venue's existing reflective surfaces reflect all added decor

5. SCALE CONSISTENCY:
   ├─ Flowers maintain real-world size
   ├─ Furniture maintains real-world proportions
   └─ Perspective diminishment: Near elements detailed, far elements simplify naturally

═══════════════════════════════════════════════════════════════════════════════
STAGE 6: PROMPT ASSEMBLY — MODE B: FULL VENUE DECORATION
═══════════════════════════════════════════════════════════════════════════════

Write ONE paragraph (380-480 words) with these components in order:

OPENING (2-3 sentences): VENUE + OVERALL TRANSFORMATION + ATMOSPHERE
"A photorealistic photograph of [VENUE] now fully decorated for a [EVENT TYPE] celebration in a [STYLE] style with [MOOD] atmosphere. The [VENUE TOP 3 FEATURES] remain completely intact. The entire scene is captured with a [COLOR GRADE] color grade."

CEILING/OVERHEAD ZONE (2 sentences): Original ceiling description + hanging decor from reference + light integration
WALLS/PERIMETER (2 sentences): Wall treatment from reference + floral accents + venue preservation
FLOOR/AISLE (2 sentences): Original floor remains visible in zones + floor treatment from reference + ground florals
FOCAL POINT/STAGE (2 sentences): Focal structure + focal florals
FURNITURE/SEATING (2 sentences): Seating arrangement + furniture accents
LIGHTING & GLOW (2-3 sentences): Overall light quality + specific light elements + atmospheric effects
COLOR GRADE & TONE (1-2 sentences): Specific color grade + saturation + tonal feel
PRESERVATION & TECHNICAL (2 sentences): List 5+ preserved venue elements + camera angle + post-processing style + "no people, no elements not described above"

═══════════════════════════════════════════════════════════════════════════════
STAGE 6B: PROMPT ASSEMBLY — MODE A: ELEMENT PLACEMENT
═══════════════════════════════════════════════════════════════════════════════

Write ONE paragraph (320-420 words) following the original structure:
SENTENCE 1-2: Venue foundation + atmosphere
SENTENCE 3-4: Venue preservation + ambient modification
SENTENCE 5-7: Specific decor placement
SENTENCE 8-9: Floral & fabric details
SENTENCE 10-12: Lighting, glow & atmospheric vibe
SENTENCE 13-14: Color grading & tonal specification
SENTENCE 15-16: Shadow & reflection integration
SENTENCE 17-18: Final preservation & technical specs

═══════════════════════════════════════════════════════════════════════════════
STAGE 7: VIBE TRANSFER QUICK-REFERENCE DICTIONARY
═══════════════════════════════════════════════════════════════════════════════

EVENT-SPECIFIC VIBE PRESETS:

HALDI: Dominant bright yellow/orange, joyful festive, warm saturated grade, marigolds+chrysanthemums, yellow chiffon, traditional carved wood, petal runner
MEHNDI: Multicolor vibrant, playful bohemian-festive, high-saturation vivid, mixed colorful flowers, bright printed fabrics, low seating/floor cushions
SANGEET: Jewel tones, glamorous dramatic, rich contrast, orchids/roses in jewel tones, sequined metallic fabrics, modern lounge + dance floor
RECEPTION: White/ivory/gold/blush, romantic grand formal, warm golden chandeliers, roses/hydrangeas/peonies, flowing elegant drapes, tufted sofas/chiavari chairs
LAVENDER/PURPLE ROYAL: Dusty lavender/mauve/gold, ultra-opulent dramatic, rich warm-gold grade, lavender roses/purple hydrangeas, velvet/satin drapes, French tufted sofas
CORAL-TURQUOISE TROPICAL: Coral/peach/turquoise/mint/gold, fresh tropical, warm pastel grade, coral roses/peach peonies, printed coral/turquoise fabric, gold-frame sofas

═══════════════════════════════════════════════════════════════════════════════
STAGE 8: MANDATORY SPECIFICITY RULES
═══════════════════════════════════════════════════════════════════════════════

PHYSICAL ELEMENTS — specific naming:
✓ "yellow marigolds and orange chrysanthemums" (NOT "yellow flowers")
✓ "bright yellow chiffon" (NOT "yellow fabric")
✓ "10-foot carved dark-wood pergola mandap" (NOT "tall structure")

LIGHTING — specific description:
✓ "warm 2800K amber glow from fairy lights creating 4-inch circular bokeh orbs"

COLOR GRADING — specific description:
✓ "warm golden color grade with creamy 3200K whites, amber shadow tones"

VENUE PRESERVATION — explicit statements:
✓ At minimum 5 specific venue elements called out as preserved

FORBIDDEN ACTIONS:
✗ Do NOT add: people, vehicles, animals
✗ Do NOT change: floor material, wall structure, ceiling structure, venue architecture
✗ Do NOT replace: venue ceiling with fabric tent (ADD fabric to existing ceiling)
✗ Do NOT replace: venue floor with different flooring (ADD runner/petals ON existing floor)
✗ Do NOT invent: decor elements not present in or implied by the reference image

CRITICAL RULE FOR FULL VENUE DECORATION:
├─ Decoration is ADDITIVE — it is placed ON TOP of the existing venue
├─ Think like an event planner: you bring things IN, you don't renovate
├─ The venue should be RECOGNIZABLE as the same venue in the final image
└─ If you covered up ALL venue identity elements, you've gone too far

═══════════════════════════════════════════════════════════════════════════════
STAGE 9: SELF-CHECK BEFORE OUTPUT
═══════════════════════════════════════════════════════════════════════════════

VENUE IDENTITY:
☑ Can someone recognize this as the SAME venue? (≥5 identity elements visible)
☑ Ceiling/floor/wall structure described as unchanged?
☑ Camera angle matches original venue image?
☑ Contains 2+ explicit "remain unchanged/unaltered/intact" statements?

DECORATION COMPLETENESS:
☑ All zones described? (ceiling, walls, floor, focal point, seating, aisle, hanging)
☑ Decor density matches user request or reference image?

DECOR STYLE ACCURACY:
☑ Flower species, color palette, furniture style from reference preserved?

VIBE TRANSFER:
☑ Color grade, lighting mood, atmospheric effects, emotional energy captured?

PHYSICAL REALISM:
☑ All furniture sits on floor? All hanging elements have suspension points?
☑ Perspective diminishment applied? Material textures specified?

TECHNICAL:
☑ Paragraph is 380-480 words (Mode B) or 320-420 words (Mode A)?
☑ Camera angle, lens, depth of field, post-processing style specified?
☑ "No people" and "no venue structural modifications" stated?

OUTPUT ONLY THE FINAL PROMPT - NO PREAMBLE, NO MARKDOWN, NO EXPLANATIONS.
Output the detected MODE (A or B) on the first line, then the prompt.`;

// ═══════════════════════════════════════════════════════════════════
// USER SIDE-PANEL PRIORITY RULES
// ═══════════════════════════════════════════════════════════════════

const SIDE_PANEL_RULES = {
  style: {
    Modern:
      "contemporary clean-lined aesthetic with geometric shapes, metallic accents, minimalist arrangements, monochromatic or analogous color schemes",
    Traditional:
      "classic ornate Indian wedding aesthetic with rich fabrics, gold accents, intricate patterns, marigold garlands, brass elements, vibrant saturated colors",
  },
  functionType: {
    "Pre-wedding (Haldi/Mehendi)":
      "focal area is a central seating platform or gaddi with turmeric-yellow theme, marigold dominance, brass vessels",
    "Wedding Ceremony":
      "focal area is a grand mandap or ceremonial arch with sacred fire pit area, heavy floral canopy, ceremonial seating",
    Reception:
      "focal area is a sweetheart table or head table with crystal chandeliers, formal round-table dining layout, dance floor",
    Sangeet:
      "focal area is a performance stage with dramatic lighting, dance floor, DJ/music setup, cocktail-height tables",
    Engagement:
      "focal area is an intimate ceremony arch or backdrop with romantic floral framing, ring ceremony area",
    Nikah:
      "focal area is a pristine white-and-green ceremony area with Islamic geometric patterns, elegant simplicity",
  },
  atmosphere: {
    "Warm & Festive":
      "warm 2800-3200K amber lighting, golden glow, high saturation, joyful energy, bright fairy lights",
    "Romantic & Intimate":
      "soft 3000K candlelit warmth, low-key lighting, gentle bokeh, dreamy soft-focus quality, rose-toned",
    "Grand & Opulent":
      "dramatic high-contrast lighting, crystal chandeliers, rich deep colors, luxurious textures, spotlit focal points",
    "Minimal & Elegant":
      "clean bright 4000K lighting, subtle accents, restrained palette, understated sophistication, crisp shadows",
    "Bohemian & Free-spirited":
      "natural warm daylight, earthy tones, organic textures, whimsical elements, macramé and dried florals",
    "Royal & Regal":
      "deep jewel-toned dramatic lighting, velvet and gold, heavy ornate elements, palace-worthy grandeur",
  },
  timing: {
    "Morning (Day light)":
      "bright natural daylight, cool-to-neutral 5000K, crisp clear shadows, fresh morning feel",
    "Afternoon (Bright)":
      "strong warm daylight 4500K, vivid colors, defined shadows, bright airy atmosphere",
    "Sunset (Golden Hour)":
      "warm golden 3500K directional light, long warm shadows, honey-toned highlights, magic hour glow",
    "Evening (Warm Glow)":
      "warm 2800K artificial lighting, fairy lights active, candle-like warmth, intimate evening ambiance",
    "Night (Under Stars)":
      "deep dark sky, dramatic uplighting, fairy light canopy overhead, moonlit cool-blue ambient with warm accent pools",
  },
};

// ─── Moodboard Title Generation ───
const MOODBOARD_TITLES = {
  "Pre-wedding (Haldi/Mehendi)": "Golden Dreams of Haldi",
  "Wedding Ceremony": "Eternal Sacred Vows",
  Reception: "A Night to Remember",
  Sangeet: "Rhythms of Celebration",
  Engagement: "Promise of Forever",
  Nikah: "Blessings of Nikkah",
};

// ─── Build user message for Groq vision ───
function buildGroqMessages(
  venueBase64,
  decorBase64,
  venueMime,
  decorMime,
  style,
  functionType,
  atmosphere,
  timing,
  userPrompt,
) {
  const styleDesc =
    SIDE_PANEL_RULES.style[style] || SIDE_PANEL_RULES.style.Traditional;
  const fnDesc = SIDE_PANEL_RULES.functionType[functionType] || "";
  const atmosDesc = SIDE_PANEL_RULES.atmosphere[atmosphere] || "";
  const timeDesc = SIDE_PANEL_RULES.timing[timing] || "";

  const userText = `Analyze these two images and generate an optimized wedding image generation prompt.

Image 1 = VENUE PHOTO (the space to be decorated — structure must be preserved exactly)
Image 2 = DECORATION REFERENCE (the style, decor, vibe to be applied to the venue)

User selections:
- Style: ${style || "Traditional"} → ${styleDesc}
- Function type: ${functionType || "Wedding Ceremony"} → ${fnDesc}
- Atmosphere: ${atmosphere || "Warm & Festive"} → ${atmosDesc}
- Timing: ${timing || "Evening (Warm Glow)"} → ${timeDesc}
${userPrompt ? `- Additional instruction: ${userPrompt}` : ""}

Generate the final image prompt now.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        {
          type: "image_url",
          image_url: {
            url: `data:${venueMime || "image/jpeg"};base64,${venueBase64}`,
            detail: "high",
          },
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${decorMime || "image/jpeg"};base64,${decorBase64}`,
            detail: "high",
          },
        },
      ],
    },
  ];
}

// ─── Call Groq Vision API ───
async function analyzeWithGroq(
  venueBuffer,
  decorBuffer,
  venueMime,
  decorMime,
  style,
  functionType,
  atmosphere,
  timing,
  userPrompt,
) {
  const venueBase64 = venueBuffer.toString("base64");
  const decorBase64 = decorBuffer.toString("base64");

  const messages = buildGroqMessages(
    venueBase64,
    decorBase64,
    venueMime || "image/jpeg",
    decorMime || "image/jpeg",
    style,
    functionType,
    atmosphere,
    timing,
    userPrompt,
  );

  console.log(`🧠 [Moodboard] Calling Groq Vision (${GROQ_VISION_MODEL})...`);

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages,
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Groq API error ${response.status}: ${errText.substring(0, 300)}`,
    );
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";

  if (!raw) throw new Error("Groq returned empty response");

  console.log(`✅ [Moodboard] Groq vision complete — ${raw.length} chars`);

  // Parse mode and prompt
  const lines = raw
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  let mode = "MODE B";
  let prompt = raw.trim();

  if (lines[0]?.toUpperCase().startsWith("MODE")) {
    mode = lines[0].trim().toUpperCase();
    prompt = lines.slice(1).join(" ").trim() || raw.trim();
  }

  return { mode, prompt, raw };
}

// ═══════════════════════════════════════════════════════════════════
// STAGE C — Prompt Hardening with Preservation Constraints
// ═══════════════════════════════════════════════════════════════════

function hardenPrompt(
  prompt,
  style,
  functionType,
  atmosphere,
  timing,
  isRetry = false,
) {
  const styleDesc = SIDE_PANEL_RULES.style[style] || "";
  const fnDesc = SIDE_PANEL_RULES.functionType[functionType] || "";
  const atmosDesc = SIDE_PANEL_RULES.atmosphere[atmosphere] || "";
  const timeDesc = SIDE_PANEL_RULES.timing[timing] || "";

  let suffix = ` Style intent: ${styleDesc}. Event focal area: ${fnDesc}. Lighting atmosphere: ${atmosDesc}. Time of day: ${timeDesc}. Photorealistic award-winning wedding photography, 8K resolution, shot on Hasselblad medium format, cinematic warm color grading with rich natural skin tones, editorial wedding magazine quality. No watermarks, no text overlays, no logos.`;

  return (prompt + suffix).trim();
}

// ═══════════════════════════════════════════════════════════════════
// STAGE D — Flux API with Aspect Ratio Detection
// ═══════════════════════════════════════════════════════════════════

// Detect aspect ratio from image buffer using sharp
async function detectAspectRatio(imageBuffer) {
  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(imageBuffer).metadata();
    const w = metadata.width;
    const h = metadata.height;
    const ratio = w / h;

    console.log(
      `📐 [Moodboard] Venue image: ${w}x${h} (ratio: ${ratio.toFixed(3)})`,
    );

    // Map to closest Flux-supported aspect ratios
    if (ratio >= 1.7) return { width: 1024, height: 576, label: "16:9" }; // landscape wide
    if (ratio >= 1.4) return { width: 1024, height: 683, label: "3:2" }; // landscape standard
    if (ratio >= 1.2) return { width: 1024, height: 768, label: "4:3" }; // landscape
    if (ratio >= 0.9) return { width: 1024, height: 1024, label: "1:1" }; // square
    if (ratio >= 0.7) return { width: 768, height: 1024, label: "3:4" }; // portrait
    if (ratio >= 0.6) return { width: 683, height: 1024, label: "2:3" }; // portrait tall
    return { width: 576, height: 1024, label: "9:16" }; // portrait very tall
  } catch (err) {
    console.warn(
      "⚠️ [Moodboard] sharp metadata failed, defaulting to 1024x1024:",
      err.message,
    );
    return { width: 1024, height: 1024, label: "1:1" };
  }
}

async function callFluxAPI(
  imageBuffer,
  prompt,
  modelType = "flux-2-pro",
  dimensions = null,
  seed = null,
  fallbackModels = null,
) {
  if (!isAIEnabled()) {
    throw new Error("AI service not configured — set BFL_API_KEY");
  }

  const baseUrl = process.env.FLUX_API_BASE_URL || "https://api.bfl.ai";
  const dim = dimensions || { width: 1024, height: 1024 };

  // Detect if model supports input_image (kontext models = image-to-image, others = text-to-image)
  const isKontextModel = modelType.includes("kontext");

  console.log(
    `🎨 [Moodboard] Calling Flux (${modelType}) at ${dim.width}x${dim.height} [${isKontextModel ? "img2img" : "txt2img"}]...`,
  );

  const body = {
    prompt: prompt,
    width: dim.width,
    height: dim.height,
    safety_tolerance: 2,
    output_format: "jpeg",
  };

  // Only include input_image for kontext (image-to-image) models
  if (isKontextModel && imageBuffer) {
    body.input_image = imageBuffer.toString("base64");
  }

  if (seed !== null && seed !== undefined) {
    body.seed = seed;
  }

  const response = await fetch(`${baseUrl}/v1/${modelType}`, {
    method: "POST",
    headers: {
      "x-key": process.env.BFL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // 403 = auth error — don't retry, the API key is invalid
    if (
      (response.status === 401 || response.status === 403) &&
      fallbackModels?.length
    ) {
      const [nextModel, ...remainingModels] = fallbackModels;
      console.log(
        `🔄 [Moodboard] ${modelType} rejected (${response.status}); trying ${nextModel}`,
      );
      return callFluxAPI(
        imageBuffer,
        prompt,
        nextModel,
        dimensions,
        seed,
        remainingModels,
      );
    }

    if (response.status === 401 || response.status === 403) {
      console.error(
        `❌ [Moodboard] BFL API key rejected (${response.status}). Check your BFL_API_KEY in .env`,
      );
      throw new Error(
        "BFL_AUTH_ERROR: BFL API authentication failed. Restart the backend after setting BFL_API_KEY; if it still fails, the key is invalid, expired, or not enabled for this model.",
      );
    }

    // 422 = model not available — try fallback model
    if (response.status === 422 && modelType !== "flux-2-max") {
      console.log(
        `🔄 [Moodboard] ${modelType} unavailable, falling back to flux-2-max`,
      );
      return callFluxAPI(imageBuffer, prompt, "flux-2-max", dimensions, seed);
    }

    throw new Error(
      `Flux error ${response.status}: ${errorText.substring(0, 200)}`,
    );
  }

  const result = await response.json();
  if (result.id) return pollForResult(result.id, result.polling_url);

  return {
    url: result.result?.sample || result.url,
    seed: result.result?.seed || Math.floor(Math.random() * 1e6),
    generationId: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}

async function pollForResult(taskId, customPollingUrl) {
  const maxAttempts = parseInt(process.env.MAX_POLL_ATTEMPTS) || 30;
  const pollInterval = parseInt(process.env.POLL_INTERVAL) || 5000;
  const baseUrl = process.env.FLUX_API_BASE_URL || "https://api.bfl.ai";

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`⏳ [Moodboard] Poll ${i + 1}/${maxAttempts}`);
    try {
      const url = customPollingUrl || `${baseUrl}/v1/get_result?id=${taskId}`;
      const res = await fetch(url, {
        headers: { "x-key": process.env.BFL_API_KEY },
      });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, pollInterval));
        continue;
      }
      const data = await res.json();
      if (data.status === "Ready") {
        return {
          url: data.result.sample,
          seed: data.result.seed || Math.floor(Math.random() * 1e6),
          generationId: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }
      if (data.status === "Error")
        throw new Error(`Flux processing error: ${data.details || data.error}`);
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error("Generation timeout — please try again");
}

// ═══════════════════════════════════════════════════════════════════
// STAGE E — Post-Generation Validation with Groq Vision
// ═══════════════════════════════════════════════════════════════════

async function validateGeneration(venueBuffer, generatedImageUrl, venueMime) {
  if (!isGroqEnabled()) {
    console.log("⚠️ [Moodboard] Validation skipped — no GROQ_API_KEY");
    return { score: 1.0, pass: true, issues: [], skipped: true };
  }

  console.log("🔍 [Moodboard] Running post-generation validation...");

  // Download the generated image
  let generatedBase64;
  try {
    const imgResponse = await fetch(generatedImageUrl);
    if (!imgResponse.ok)
      throw new Error(`Failed to fetch generated image: ${imgResponse.status}`);
    const imgBuffer = await imgResponse.buffer();
    generatedBase64 = imgBuffer.toString("base64");
  } catch (err) {
    console.warn(
      "⚠️ [Moodboard] Could not download generated image for validation:",
      err.message,
    );
    return {
      score: 0.8,
      pass: true,
      issues: ["Could not download for validation"],
      skipped: true,
    };
  }

  const venueBase64 = venueBuffer.toString("base64");

  const validationPrompt = `You are a QUALITY CONTROL validator for AI-generated wedding venue decoration images.

Compare these two images:
Image 1 = ORIGINAL VENUE (before decoration)
Image 2 = AI-GENERATED RESULT (after AI decoration was applied)

Evaluate the GENERATED image on these criteria:

1. STRUCTURAL PRESERVATION (0-1): Are the venue's walls, floor, ceiling, columns, doors, windows, and branded elements preserved? Do they look like the same physical space?
2. CAMERA ANGLE MATCH (0-1): Is the camera viewpoint, perspective, and framing identical to the original?
3. ARCHITECTURE INTEGRITY (0-1): Are architectural lines, proportions, and spatial relationships maintained?
4. REALISM QUALITY (0-1): Does the decoration look photorealistic? No floating objects, no impossible physics?
5. VENUE RECOGNITION (0-1): Can you confirm this is definitely the SAME venue, just decorated?

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "structural_preservation": <0-1>,
  "camera_angle_match": <0-1>,
  "architecture_integrity": <0-1>,
  "realism_quality": <0-1>,
  "venue_recognition": <0-1>,
  "overall_score": <0-1 weighted average>,
  "pass": <true if overall_score >= 0.75>,
  "issues": ["list of specific problems found, empty if none"]
}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a precise image quality validator. Respond only with valid JSON.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: validationPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${venueMime || "image/jpeg"};base64,${venueBase64}`,
                  detail: "high",
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${generatedBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(
        "⚠️ [Moodboard] Validation Groq call failed:",
        errText.substring(0, 200),
      );
      return {
        score: 0.8,
        pass: true,
        issues: ["Validation API error"],
        skipped: true,
      };
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);
    const score = result.overall_score || 0;
    const pass = score >= 0.75;

    console.log(
      `🔍 [Moodboard] Validation: score=${score.toFixed(2)}, pass=${pass}, issues=${(result.issues || []).length}`,
    );

    return {
      score,
      pass,
      structural_preservation: result.structural_preservation,
      camera_angle_match: result.camera_angle_match,
      architecture_integrity: result.architecture_integrity,
      realism_quality: result.realism_quality,
      venue_recognition: result.venue_recognition,
      issues: result.issues || [],
      skipped: false,
    };
  } catch (err) {
    console.warn("⚠️ [Moodboard] Validation parsing error:", err.message);
    return {
      score: 0.8,
      pass: true,
      issues: ["Validation parse error"],
      skipped: true,
    };
  }
}

// ─── Build fallback prompt for wedding moodboard (text-to-image) ───
function buildFallbackPrompt(
  style,
  functionType,
  atmosphere,
  timing,
  userPrompt,
) {
  const styleDesc =
    SIDE_PANEL_RULES.style[style] || SIDE_PANEL_RULES.style.Traditional;
  const atmosDesc =
    SIDE_PANEL_RULES.atmosphere[atmosphere] || "warm golden lighting";
  const timeDesc = SIDE_PANEL_RULES.timing[timing] || "evening warm glow";

  const eventStyles = {
    "Pre-wedding (Haldi/Mehendi)":
      "an Indian Haldi and Mehendi pre-wedding celebration with vibrant turmeric yellows, marigold oranges, traditional brass elements, cascading flower petals, intricate mehndi patterns, and joyful festive energy. Guests wear bright yellow and orange traditional attire with gold jewelry and fresh flower accessories",
    "Wedding Ceremony":
      "a grand Indian wedding ceremony with rich crimson reds, burnished golds, ivory whites. An ornate mandap with carved pillars and silk canopy, sacred fire, fresh red roses and white jasmine garlands, elaborate bridal lehenga in red and gold, groom in embroidered sherwani. Regal, sacred atmosphere",
    Reception:
      "a luxurious Indian wedding reception with sophisticated ivory, champagne gold, blush pink tones. Crystal chandeliers, elegant table settings with fine china, tall centerpieces of white hydrangeas and blush roses. The couple in glamorous reception outfits, soft ambient uplighting",
    Sangeet:
      "a vibrant Indian Sangeet night with rich jewel tones of deep purple, fuchsia, emerald, and metallic gold. Dramatic performance stage, mirror-work lanterns, sequined fabric decor, energetic dancing, colorful embroidered outfits, festive lighting",
    Engagement:
      "a romantic Indian engagement ceremony with soft pastel pink, ivory, rose gold tones. A floral arch of blush roses and white peonies, the couple elegantly dressed exchanging rings, floating candles, intimate warm lighting, tender romantic moments",
    Nikah:
      "an elegant Nikah ceremony with pristine white, emerald green, and burnished gold palette. Islamic geometric patterns in gold filigree, white roses and green ferns, the bride in ornate bridal hijab with intricate embroidery, the groom in classic sherwani. Sacred, graceful atmosphere",
  };

  const baseScene =
    eventStyles[functionType] ||
    "a beautiful Indian wedding celebration with elaborate decorations, rich cultural elements, and emotional moments";

  return `Award-winning photorealistic wedding photography of ${baseScene}. ${styleDesc}. ${atmosDesc}. ${timeDesc}. 8K resolution, shot on Hasselblad medium format, cinematic warm color grading with rich natural skin tones, shallow depth of field, editorial wedding magazine quality. ${userPrompt || ""}`.trim();
}

// ─── Generate 4 diverse variation prompts for moodboard collage ───
function generateVariationPrompts(basePrompt, functionType) {
  const variations = [
    {
      label: "Couple Portrait",
      suffix:
        "Intimate waist-up portrait of a beautiful Indian couple in ornate wedding attire, soft eye contact or gentle embrace. Lush floral backdrop with warm bokeh fairy lights. Shot at f/1.8 with warm golden rim lighting. Deeply romantic, editorial bridal magazine quality.",
    },
    {
      label: "Grand Ceremony",
      suffix:
        "Breathtaking wide cinematic shot of the full decorated ceremony venue with the couple at the center, surrounded by elaborate floral arrangements, traditional structural elements, fabric draping, and atmospheric lighting. Shot at f/4 with vivid detail. Grand, spectacular composition showing the full scale of the celebration.",
    },
    {
      label: "Sacred Details",
      suffix:
        "Artistic close-up detail composition of wedding elements: intricate mehendi patterns on hands with ornate rings, bridal jewelry on skin, fresh flower garlands, ceremonial items, luxurious fabric textures. Macro photography style, f/2.8, warm soft directional lighting highlighting textures and golden metallics.",
    },
    {
      label: "Celebration",
      suffix:
        "Candid photojournalistic moment of warm celebration: family blessings, joyful group embrace, or an intimate couple moment with genuine emotion. Natural expressions captured mid-action with beautiful warm ambient bokeh. Authentic and full of life. Shot at f/2.0.",
    },
  ];

  return variations.map((v) => ({
    label: v.label,
    prompt: `${basePrompt} ${v.suffix}`,
  }));
}

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

function mapGeminiAspectRatio(dimensions) {
  if (!dimensions?.label) return "4:3";
  const supportedRatios = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);
  if (supportedRatios.has(dimensions.label)) return dimensions.label;
  if ((dimensions.width || 0) >= (dimensions.height || 0)) return "4:3";
  return "3:4";
}

function extractGeminiImageParts(responseData = {}) {
  const parts =
    responseData?.candidates?.flatMap(
      (candidate) => candidate?.content?.parts || [],
    ) || [];
  return parts
    .filter((part) => part?.inlineData?.data)
    .map((part, index) => ({
      url: `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`,
      seed: Date.now() + index,
      generationId: `gem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    }));
}

async function callGeminiImageAPI(
  imageBuffer,
  prompt,
  modelType = GEMINI_IMAGE_MODEL,
  dimensions = null,
) {
  if (!isAIEnabled()) {
    throw new Error("AI service not configured — set GEMINI_API_KEY");
  }

  const promptParts = [];
  if (imageBuffer) {
    promptParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBuffer.toString("base64"),
      },
    });
  }
  promptParts.push({ text: prompt });

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${modelType}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: promptParts,
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: mapGeminiAspectRatio(dimensions),
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "GEMINI_AUTH_ERROR: Gemini API authentication failed. Restart the backend after setting GEMINI_API_KEY; if it still fails, the key is invalid or does not have image generation access.",
      );
    }
    throw new Error(
      `Gemini error ${response.status}: ${errorText.substring(0, 300)}`,
    );
  }

  const result = await response.json();
  const imageParts = extractGeminiImageParts(result);
  if (imageParts.length === 0) {
    const textParts = result?.candidates
      ?.flatMap((candidate) => candidate?.content?.parts || [])
      .filter((part) => part?.text)
      .map((part) => part.text)
      .join(" ")
      .trim();
    throw new Error(
      `Gemini returned no image output.${textParts ? ` ${textParts}` : ""}`,
    );
  }

  return imageParts[0];
}

// Health check
router.get("/couple-moodboard/health", async (_req, res) => {
  res.json({
    success: true,
    service: "Couple Moodboard AI (Advanced V2 Pipeline)",
    groq_configured: isGroqEnabled(),
    groq_model: GROQ_VISION_MODEL,
    gemini_configured: isAIEnabled(),
    credit_cost: CREDIT_COST,
    validation_enabled: VALIDATION_ENABLED,
    max_retries: MAX_RETRIES,
    pipeline_stages: [
      "A:SystemPrompt",
      "B:GroqVision",
      "C:PromptHarden",
      "D:GeminiGenerate",
      "E:Validate+Retry",
    ],
    timestamp: new Date().toISOString(),
  });
});

// Main generation — Full 5-Stage Pipeline
router.post(
  "/couple-moodboard/generate",
  protect,
  upload.fields([
    { name: "venueImage", maxCount: 1 },
    { name: "decorImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const timer = createTimer();

    try {
      if (!isAIEnabled()) {
        return res
          .status(503)
          .json({
            success: false,
            error: "AI service not configured — set GEMINI_API_KEY",
          });
      }

      const venueFile = req.files?.venueImage?.[0];
      const decorFile = req.files?.decorImage?.[0];
      const hasImages = !!(venueFile && decorFile);

      const {
        style,
        functionType,
        atmosphere,
        timing,
        userPrompt,
        seed: userSeed,
      } = req.body;
      const user = req.user;

      console.log("🎨 [Moodboard] ═══ PIPELINE START ═══");
      console.log("🎨 [Moodboard] Request:", {
        style,
        functionType,
        atmosphere,
        timing,
        userId: user._id,
      });

      // Credit check
      if ((user.credits || 0) < CREDIT_COST) {
        return res.status(402).json({
          success: false,
          error: "Insufficient credits",
          currentCredits: user.credits || 0,
          requiredCredits: CREDIT_COST,
        });
      }

      timer.mark("creditCheck");

      // ─ Detect aspect ratio (from venue image or default landscape) ─
      const dimensions = hasImages
        ? await detectAspectRatio(venueFile.buffer)
        : { width: 1024, height: 768, label: "4:3" };
      timer.mark("aspectRatioDetection");

      // ─ Stage B: Groq Vision Analysis (only if images provided) ─
      let visionResult;
      let visionFallback = false;

      if (hasImages && isGroqEnabled()) {
        try {
          visionResult = await analyzeWithGroq(
            venueFile.buffer,
            decorFile.buffer,
            venueFile.mimetype,
            decorFile.mimetype,
            style,
            functionType,
            atmosphere,
            timing,
            userPrompt,
          );
          timer.mark("groqVision");
        } catch (groqErr) {
          console.error(
            "⚠️ [Moodboard] Groq failed, using fallback:",
            groqErr.message,
          );
          visionFallback = true;
          timer.mark("groqVisionFailed");
        }
      } else {
        if (!hasImages)
          console.log(
            "ℹ️ [Moodboard] No images — using text-to-image moodboard",
          );
        else
          console.log("⚠️ [Moodboard] No GROQ_API_KEY — using fallback prompt");
        visionFallback = true;
      }

      if (visionFallback || !visionResult) {
        visionResult = {
          mode: "MODE B",
          prompt: buildFallbackPrompt(
            style,
            functionType,
            atmosphere,
            timing,
            userPrompt,
          ),
          fallback: true,
        };
        timer.mark("fallbackPrompt");
      }

      // ─ Stage C: Harden prompt ─
      const hardenedPrompt = hardenPrompt(
        visionResult.prompt,
        style,
        functionType,
        atmosphere,
        timing,
        false,
      );
      timer.mark("promptHarden");

      // ─ Stage D: Generate 4 Variation Images in Parallel ─
      const parsedSeed = userSeed ? parseInt(userSeed) : null;
      const variationPrompts = generateVariationPrompts(
        hardenedPrompt,
        functionType,
      );
      // Always use text-to-image for diverse moodboard scenes
      const modelType = GEMINI_IMAGE_MODEL;

      console.log(
        `🎨 [Moodboard] Firing 4 parallel Gemini (${modelType}) calls...`,
      );

      const imageGenerationPromises = variationPrompts.map((v, idx) => {
        const variationSeed = parsedSeed ? parsedSeed + idx : null;
        return callGeminiImageAPI(null, v.prompt, modelType, dimensions)
          .then((result) => ({ success: true, label: v.label, ...result }))
          .catch((err) => {
            console.error(
              `❌ [Moodboard] Variation "${v.label}" failed:`,
              err.message,
            );
            return { success: false, label: v.label, error: err.message };
          });
      });

      const imageResults = await Promise.all(imageGenerationPromises);
      timer.mark("imageGeneration");

      // Collect successful results
      const rawGeneratedImages = imageResults
        .filter((r) => r.success && r.url)
        .map((r) => ({
          url: r.url,
          label: r.label,
          seed: r.seed,
          generationId: r.generationId,
        }));

      const failedCount = imageResults.filter((r) => !r.success).length;

      if (rawGeneratedImages.length === 0) {
        const firstError = imageResults.find((r) => r.error)?.error || "";
        if (imageResults.some((r) => isGeminiAuthError(r.error))) {
          return res.status(401).json({
            success: false,
            error:
              "Gemini authentication failed. Restart the backend after setting GEMINI_API_KEY; if this continues, verify the key in Google AI Studio and confirm image generation is enabled for it.",
            details: firstError.replace(/^GEMINI_AUTH_ERROR:\s*/, ""),
            pipelineTimings: timer.getTimings(),
          });
        }
        throw new Error("All 4 image generations failed. Please try again.");
      }

      let generatedImages = rawGeneratedImages;
      let persistenceFailure = false;
      try {
        generatedImages = await persistGeneratedMoodboardImages(
          rawGeneratedImages,
          functionType,
        );
      } catch (persistErr) {
        console.error(
          "⚠️ [Moodboard] Failed to persist generated images:",
          persistErr,
          { rawGeneratedImages, functionType },
        );
        // Mark failure but continue with in-memory generated images so user gets results
        persistenceFailure = true;
      }

      console.log(
        `✅ [Moodboard] ${generatedImages.length}/4 images generated successfully (${failedCount} failed)` +
          (persistenceFailure ? " (persistence failed for some items)" : ""),
      );

      // ─ Deduct credits ─
      const moodboardTitle = MOODBOARD_TITLES[functionType] || "Wedding Vision";
      const responseData = {
        success: true,
        mode: visionResult.mode,
        generatedImages,
        moodboardTitle,
        // Keep backward compat: first image as primary
        generatedImageUrl: generatedImages[0]?.url,
        seed: generatedImages[0]?.seed,
        generationId: generatedImages[0]?.generationId,
        finalPrompt: hardenedPrompt,
        originalPrompt: visionResult.prompt,
        visionFallback,
        groqModel: visionFallback ? null : GROQ_VISION_MODEL,
        aspectRatio: dimensions.label,
        dimensions: { width: dimensions.width, height: dimensions.height },
        totalGenerated: generatedImages.length,
        totalFailed: failedCount,
        pipelineTimings: timer.getTimings(),
        persistenceFailure: persistenceFailure,
      };

      try {
        const oldCredits = user.credits;
        user.deductCredits(
          CREDIT_COST,
          "Couple moodboard generation",
          "ai_generation",
          {
            mode: visionResult.mode,
            generationId:
              generatedImages[0]?.generationId || `mb_${Date.now()}`,
            style,
            functionType,
            imageCount: generatedImages.length,
          },
        );

        const subscription = await Subscription.findOne({
          userId: user._id,
        }).sort({ createdAt: -1 });
        if (subscription) {
          subscription.creditsUsed =
            (subscription.creditsUsed || 0) + CREDIT_COST;
          await subscription.save();
        }

        await user.save();

        responseData.creditInfo = {
          deducted: CREDIT_COST,
          oldBalance: oldCredits,
          newBalance: user.credits,
        };
      } catch (deductErr) {
        console.error(
          "⚠️ [Moodboard] Credit deduction error:",
          deductErr.message,
        );
        responseData.creditWarning =
          "Generation succeeded but credits were not deducted.";
      }

      timer.mark("complete");
      console.log(
        `🎨 [Moodboard] ═══ PIPELINE COMPLETE (${timer.elapsed()}ms) ═══`,
      );

      return res.json(responseData);
    } catch (error) {
      console.error("❌ [Moodboard] Generation error:", error);
      timer.mark("error");
      let statusCode = 500;
      let msg = "Moodboard generation failed. Please try again.";
      if (error.message.includes("timeout"))
        msg = "Generation timed out. Please try again.";
      else if (
        error.message.includes("rate") ||
        error.message.includes("busy")
      ) {
        msg = "Service is busy. Please wait.";
        statusCode = 429;
      } else if (error.message.includes("credits")) {
        msg = error.message;
        statusCode = 402;
      } else if (error.message.includes("not configured")) {
        msg = error.message;
        statusCode = 503;
      } else if (isGeminiAuthError(error.message)) {
        msg =
          "Gemini authentication failed. Restart the backend after setting GEMINI_API_KEY; if this continues, verify the key in Google AI Studio and confirm image generation is enabled for it.";
        statusCode = 401;
      }
      return res
        .status(statusCode)
        .json({
          success: false,
          error: msg,
          pipelineTimings: timer.getTimings(),
        });
    }
  },
);

// ─── Image download proxy ───
router.post(
  "/couple-moodboard/edit-image",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!isAIEnabled()) {
        return res
          .status(503)
          .json({
            success: false,
            error: "AI service not configured — set GEMINI_API_KEY",
          });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Image file is required" });
      }

      const {
        editPrompt = "",
        functionType = "Wedding Ceremony",
        style = "Modern",
        atmosphere = "Warm & Festive",
        timing = "Evening (Warm Glow)",
        theme = "Wedding",
        colorTone = "",
        lighting = "",
      } = req.body;

      const dimensions = await detectAspectRatio(req.file.buffer);
      // Credit check & tentative deduction for edit operation
      const user = req.user;
      if ((user.credits || 0) < CREDIT_COST) {
        return res.status(402).json({
          success: false,
          error: "Insufficient credits for edit",
          currentCredits: user.credits || 0,
          requiredCredits: CREDIT_COST,
        });
      }

      try {
        // Deduct in-memory; we'll persist after successful edit or roll back on failure
        user.deductCredits(
          CREDIT_COST,
          "Couple moodboard edit",
          "ai_generation",
          { functionType },
        );
      } catch (deductErr) {
        console.error(
          "⚠️ [Moodboard] Failed to deduct credits for edit:",
          deductErr,
        );
        return res
          .status(402)
          .json({ success: false, error: "Insufficient credits" });
      }
      const refinementPrompt = [
        `Edit this wedding photo for a ${functionType} moodboard.`,
        `Keep it photoreal and premium in ${style} style.`,
        atmosphere ? `Atmosphere: ${atmosphere}.` : "",
        timing ? `Timing: ${timing}.` : "",
        theme ? `Theme: ${theme}.` : "",
        colorTone ? `Color tone: ${colorTone}.` : "",
        lighting ? `Lighting direction: ${lighting}.` : "",
        editPrompt
          ? `Refinement request: ${editPrompt}.`
          : "Refine the decor details while keeping the composition elegant.",
      ]
        .filter(Boolean)
        .join(" ");

      let result;
      try {
        result = await callGeminiImageAPI(
          req.file.buffer,
          refinementPrompt,
          GEMINI_IMAGE_MODEL,
          dimensions,
        );
      } catch (apiErr) {
        // Rollback tentative credit deduction
        try {
          user.addCredits(
            CREDIT_COST,
            "Rollback edit-image",
            "ai_generation_rollback",
            { originalAction: "edit-image" },
          );
          await user.save();
        } catch (rbErr) {
          console.error(
            "⚠️ [Moodboard] Failed to rollback credits after edit-image error:",
            rbErr,
          );
        }
        throw apiErr; // let outer handler return an error response
      }

      // Persist credit deduction (subscription tracking) after successful edit
      try {
        const subscription = await Subscription.findOne({
          userId: user._id,
        }).sort({ createdAt: -1 });
        if (subscription) {
          subscription.creditsUsed =
            (subscription.creditsUsed || 0) + CREDIT_COST;
          await subscription.save();
        }
        await user.save();
      } catch (persistErr) {
        console.error(
          "⚠️ [Moodboard] Failed to persist credit deduction after edit:",
          persistErr,
        );
      }

      return res.json({
        success: true,
        image: result,
        promptUsed: refinementPrompt,
        dimensions,
      });
    } catch (error) {
      console.error("❌ [Moodboard] Edit image error:", error);
      let statusCode = 500;
      let msg = "Failed to edit image. Please try again.";
      if (error.message.includes("not configured")) {
        msg = error.message;
        statusCode = 503;
      } else if (isGeminiAuthError(error.message)) {
        msg = "Gemini authentication failed. Please verify GEMINI_API_KEY.";
        statusCode = 401;
      } else if (
        error.message.includes("busy") ||
        error.message.includes("rate")
      ) {
        msg = "AI service is busy. Please wait and try again.";
        statusCode = 429;
      }
      return res.status(statusCode).json({ success: false, error: msg });
    }
  },
);

router.post("/couple-moodboard/download-image", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl)
      return res
        .status(400)
        .json({ success: false, error: "imageUrl required" });
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": "LoversAI/1.0" },
    });
    if (!response.ok)
      return res
        .status(response.status)
        .json({ success: false, error: "Failed to fetch image" });
    const buffer = await response.buffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (error) {
    console.error("❌ [Moodboard] Download proxy error:", error);
    res.status(500).json({ success: false, error: "Failed to download image" });
  }
});

export default router;
