// Category definitions
const CATEGORIES = {
  banner: {
    id: "banner",
    name: "Banner",
    icon: "🎯",
    description: "Billboard and advertising banners",
  },
  card: {
    id: "card",
    name: "Card",
    icon: "💳",
    description: "Business cards and ID cards",
  },
  cup: {
    id: "cup",
    name: "Cup",
    icon: "☕",
    description: "Coffee cups and drink containers",
  },
  bag: {
    id: "bag",
    name: "Bag",
    icon: "🎒",
    description: "Bags and pouches",
  },
};

// Simple template list - just add your templates here with one ID!
// The system will automatically group them by category
export const TEMPLATE_LIST = [
  // Banner templates
  {
    id: "billboard-street",
    name: "Street Billboard",
    image: "/2d-mockup/banner/blank-advertising-stand-near-street-city.jpg",
    category: "banner",
  },
  {
    id: "billboard-rectangular",
    name: "Rectangular Billboard",
    image: "/2d-mockup/banner/rectangular-blank-billboard-glass-window-with-blinds.jpg",
    category: "banner",
  },
  // Card templates
  {
    id: "card-business",
    name: "Business Card",
    image: "/2d-mockup/cards/blank-white-business-card-presentation-corporate-identity-wood-background.jpg",
    category: "card",
  },
  {
    id: "card-business-2",
    name: "Business Card 2",
    image: "/2d-mockup/cards/62885.png",
    category: "card",
  },
  {
    id: "bag-pouch",
    name: "Pouch Bag",
    image: "/2d-mockup/bags/62040.jpg",
    category: "bag",
  },
  {
    id: "cup-coffee",
    name: "Coffee Cup",
    image: "/2d-mockup/cups/take-away-plastic-coffee-cup.jpg",
    category: "cup",
  },
  // Add more templates here - just one simple object per template!
];

// Automatically group templates by category
export const TEMPLATE_CATEGORIES = Object.values(CATEGORIES).map((category) => ({
  ...category,
  templates: TEMPLATE_LIST.filter((template) => template.category === category.id),
}));

// Template configurations with area settings for the editor
// Default values are used if not specified
const DEFAULT_CARD_CONFIG = {
  areaWidth: 0.35,
  areaHeight: 0.2,
  areaX: 0.5,
  areaY: 0.5,
  perspective: {
    rotation: -12,
    skewX: 0.12,
    skewY: -0.08,
  },
};

const DEFAULT_BANNER_CONFIG = {
  areaWidth: 0.32,
  areaHeight: 0.42,
  areaX: 0.56,
  areaY: 0.18,
};

// Generate TEMPLATES object from TEMPLATE_LIST
export const TEMPLATES = {};

TEMPLATE_LIST.forEach((template) => {
  const baseConfig = {
    image: template.image,
    name: template.name,
    category: template.category,
  };

  // Apply default configs based on category
  if (template.category === "card") {
    TEMPLATES[template.id] = {
      ...baseConfig,
      ...DEFAULT_CARD_CONFIG,
    };
  } else if (template.category === "banner") {
    TEMPLATES[template.id] = {
      ...baseConfig,
      ...DEFAULT_BANNER_CONFIG,
    };
  } else {
    // Default config for other categories
    TEMPLATES[template.id] = {
      ...baseConfig,
      areaWidth: 0.4,
      areaHeight: 0.4,
      areaX: 0.5,
      areaY: 0.5,
    };
  }
});

// Override specific template configs here if needed
// Example: If a specific card needs different area settings
// TEMPLATES["card-business"] = {
//   ...TEMPLATES["card-business"],
//   areaWidth: 0.4,
//   areaHeight: 0.25,
// };

