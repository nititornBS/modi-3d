

export const MODEL_FILES = {
  // Cup models - automatically mapped from public/3d-models folder
  // To add more models: Just add a new object with id, name, description, file path, and type
  cup: [
    { 
      id: "cup-1", 
      name: "Cup 1", 
      description: "Tea mug with handle",
      file: "/3d-models/Tea_Mug.obj",
      type: "obj",
      icon: "☕"
    },
    { 
      id: "cup-2", 
      name: "Cup 2", 
      description: "Coffee cup",
      file: "/3d-models/coffee_cup_obj.obj",
      type: "obj",
      icon: "☕"
    },
    { 
      id: "cup-3", 
      name: "Cup 3", 
      description: "Paper cup",
      file: "/3d-models/paper_cup.obj",
      type: "obj",
      icon: "🥤",
      components: [
        { id: "cup-cap", name: "Cap", groupName: "cup cap" },
        { id: "cup-body", name: "Body", groupName: "cup cup1" },
        { id: "cup-all", name: "All Components", groupName: null } // null means show all
      ]
    },
  ],
  // Shirt models
  shirt: [
    { 
      id: "shirt-1", 
      name: "T-Shirt", 
      description: "Classic crew neck",
      file: "/3d-models/t_shirt.glb",
      type: "glb"
    },
  ],
  // Bottle models (placeholder - no files yet)
  bottle: [],
  // Box models (placeholder - no files yet)
  box: [],
};

// Helper function to get all model files
export function getAllModelFiles() {
  const allFiles = [];
  Object.keys(MODEL_FILES).forEach(category => {
    MODEL_FILES[category].forEach(model => {
      allFiles.push({
        ...model,
        category,
      });
    });
  });
  return allFiles;
}

// Helper function to get model by ID
export function getModelById(id) {
  const allFiles = getAllModelFiles();
  return allFiles.find(model => model.id === id);
}

// Helper function to get models by category
export function getModelsByCategory(category) {
  return MODEL_FILES[category] || [];
}

