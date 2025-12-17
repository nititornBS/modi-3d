/**

 * 3D Model Mapping Configuration

 * 

 * This file maps all 3D model files to their display names and metadata.

 * To add a new model:

 * 1. Place the model file in public/3d-models/[category]/ folder

 * 2. Add an entry below with: id, displayName, description, file path, and type

 */



// Base path for all 3D models

const BASE_MODEL_PATH = "/3d-models";



/**

 * Model file mappings organized by category

 * Each model entry contains:

 * - id: Unique identifier (used in URLs and code)

 * - displayName: Name shown to users on the website

 * - description: Brief description of the model

 * - file: Path to the model file (relative to public folder)

 * - type: File type ("obj", "glb", "gltf")

 * - icon: Optional emoji icon for display

 * - components: Optional array for multi-component models

 */

export const MODEL_FILES = {

  // Cup models

  cup: [

    { 

      id: "cup-1", 

      displayName: "Tea Mug", 

      description: "Classic tea mug with handle",

      file: `${BASE_MODEL_PATH}/Cups/teamugobj.obj`,

      type: "obj",

      icon: "☕",
      // Optional preview image (add when available)
      preview: `${BASE_MODEL_PATH}/Cups/teamugobj.png`

    },

    { 

      id: "cup-2", 

      displayName: "Coffee Cup", 

      description: "Modern coffee cup design",

      file: `${BASE_MODEL_PATH}/Cups/coffee_cup_obj.obj`,

      type: "obj",

      icon: "☕",
      preview: `${BASE_MODEL_PATH}/Cups/coffee_cup.png`

    },

    { 

      id: "cup-3", 

      displayName: "Plastic Cup", 

      description: "Plastic cup design",

      file: `${BASE_MODEL_PATH}/Cups/Plastic_Cup-(Wavefront OBJ).obj`,

      type: "obj",

      icon: "☕",
      preview: `${BASE_MODEL_PATH}/Cups/Plastic_Cup.jpg`

    },

    // Paper cup model file not found - uncomment when file is added

    // { 

    //   id: "cup-3", 

    //   displayName: "Paper Cup", 

    //   description: "Disposable paper cup with lid",

    //   file: `${BASE_MODEL_PATH}/paper_cup.obj`,

    //   type: "obj",

    //   icon: "🥤",

    //   components: [

    //     { id: "cup-cap", name: "Cap", groupName: "cup cap" },

    //     { id: "cup-body", name: "Body", groupName: "cup cup1" },

    //     { id: "cup-all", name: "All Components", groupName: null }

    //   ]

    // },

  ],

  

  // Shirt/Apparel models

  shirt: [

    // T-shirt model file not found - uncomment when file is added

    // { 

    //   id: "shirt-1", 

    //   displayName: "Classic T-Shirt", 

    //   description: "Classic crew neck t-shirt",

    //   file: `${BASE_MODEL_PATH}/t_shirt.glb`,

    //   type: "glb",

    //   icon: "👕"

    // },

  ],

  

  // Bottle models

  // Currently no valid bottle model files in /public/3d-models/Bottles,
  // so this list is left empty to avoid 404 errors when loading.
  // When you add a real bottle model file under that folder,
  // add an entry here pointing to the correct path.
  bottle: [
    { 

      id: "bottle-1", 
      displayName: "Pill Bottle", 
      description: "Pill bottle model",
      file: `${BASE_MODEL_PATH}/Bottles/Pill_bottle.obj`,
      type: "obj",
      icon: "🍼",
      preview: `${BASE_MODEL_PATH}/Bottles/Pill_bottle.png`
    },
    // {
    //   id: "bottle-1",
    //   displayName: "Water Bottle",
    //   description: "Water bottle model",
    //   file: `${BASE_MODEL_PATH}/Bottles/Your_Bottle_File.obj`,
    //   type: "obj",
    //   icon: "🍼",
    // },
  ],

  

  // Box models

  box: [

    { 

      id: "box-1", 

      displayName: "Cardboard Box", 

      description: "Cardboard box model",

      file: `${BASE_MODEL_PATH}/Boxes/Cardboard_box.obj`,

      type: "obj",

      icon: "📦",
      preview: `${BASE_MODEL_PATH}/Boxes/Cardboard_box.jpg`

    },
    { 

      id: "box-2", 
      displayName: "Pizza Box", 
      description: "Pizza box model",
      file: `${BASE_MODEL_PATH}/Boxes/14037_Pizza_Box_v2_L1.obj`,
      type: "obj",
      icon: "📦",
      preview: `${BASE_MODEL_PATH}/Boxes/14037_Pizza_Box_v2_L1.jpg`
    },

    // Add box models here when files are available

    // Example:

    // { 

    //   id: "box-1", 

    //   displayName: "Gift Box", 

    //   description: "Square gift box",

    //   file: `${BASE_MODEL_PATH}/Boxes/gift_box.obj`,

    //   type: "obj",

    //   icon: "📦"

    // },

  ],

};



/**

 * Category metadata for display purposes

 */

export const CATEGORY_INFO = {

  cup: {

    displayName: "Cups & Mugs",

    icon: "☕",

    description: "Coffee cups, tea mugs, and drink containers"

  },

  shirt: {

    displayName: "Apparel",

    icon: "👕",

    description: "T-shirts, hoodies, and clothing items"

  },

  bottle: {

    displayName: "Bottles",

    icon: "🍼",

    description: "Water bottles, containers, and drink bottles"

  },

  box: {

    displayName: "Boxes",

    icon: "📦",

    description: "Packaging boxes and containers"

  },

};



/**

 * Helper Functions

 */



/**

 * Get all model files from all categories

 * @returns {Array} Array of all models with their category

 */

export function getAllModelFiles() {

  const allFiles = [];

  Object.keys(MODEL_FILES).forEach(category => {

    MODEL_FILES[category].forEach(model => {

      allFiles.push({

        ...model,

        category,

        // For backward compatibility, also include 'name' as alias for 'displayName'

        name: model.displayName || model.name,

      });

    });

  });

  return allFiles;

}



/**

 * Get a model by its unique ID

 * @param {string} id - The model ID

 * @returns {Object|null} The model object or null if not found

 */

export function getModelById(id) {

  const allFiles = getAllModelFiles();

  const model = allFiles.find(model => model.id === id);

  if (model) {

    // For backward compatibility

    model.name = model.displayName || model.name;

  }

  return model || null;

}



/**

 * Get all models in a specific category

 * @param {string} category - The category name (cup, shirt, bottle, box)

 * @returns {Array} Array of models in that category

 */

export function getModelsByCategory(category) {

  const models = MODEL_FILES[category] || [];

  // For backward compatibility, add 'name' alias

  return models.map(model => ({

    ...model,

    name: model.displayName || model.name,

  }));

}



/**

 * Get the display name for a model

 * @param {string} id - The model ID

 * @returns {string} The display name or "Unknown Model" if not found

 */

export function getModelDisplayName(id) {

  const model = getModelById(id);

  return model?.displayName || model?.name || "Unknown Model";

}



/**

 * Get category information

 * @param {string} category - The category name

 * @returns {Object|null} Category info object or null if not found

 */

export function getCategoryInfo(category) {

  return CATEGORY_INFO[category] || null;

}



/**

 * Get all available categories

 * @returns {Array} Array of category names

 */

export function getAllCategories() {

  return Object.keys(MODEL_FILES);

}



/**

 * Get the default model file path for a category

 * @param {string} category - The category name

 * @returns {string|null} The file path of the first model in the category, or null if none exists

 */

export function getDefaultModelPath(category) {

  const models = getModelsByCategory(category);

  return models.length > 0 ? models[0].file : null;

}



/**

 * Get the default model for a category

 * @param {string} category - The category name

 * @returns {Object|null} The first model in the category, or null if none exists

 */

export function getDefaultModel(category) {

  const models = getModelsByCategory(category);

  return models.length > 0 ? models[0] : null;

}

