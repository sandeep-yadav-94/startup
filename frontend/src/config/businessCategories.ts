export type BusinessCategory = {
  id: string;
  name: string;
  group: string;
  icon: string;
  aliases: string[];
};

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: "kirana-general-store", name: "Kirana / General Store", group: "Food & Grocery", icon: "🛒", aliases: ["kirana", "general store"] },
  { id: "grocery-store", name: "Grocery Store", group: "Food & Grocery", icon: "🛍️", aliases: ["grocery"] },
  { id: "supermarket", name: "Supermarket", group: "Food & Grocery", icon: "🏬", aliases: ["super market"] },
  { id: "dairy-milk-products", name: "Dairy & Milk Products", group: "Food & Grocery", icon: "🥛", aliases: ["dairy", "milk products"] },
  { id: "fruits-vegetables", name: "Fruits & Vegetables", group: "Food & Grocery", icon: "🥬", aliases: ["fruits", "vegetables"] },
  { id: "sweet-shop", name: "Sweet Shop / Mithai", group: "Food & Grocery", icon: "🍬", aliases: ["mithai", "sweet shop"] },
  { id: "bakery", name: "Bakery", group: "Food & Grocery", icon: "🥐", aliases: ["bakery"] },
  { id: "restaurant", name: "Restaurant", group: "Food & Grocery", icon: "🍽️", aliases: ["restaurant"] },
  { id: "cafe", name: "Cafe", group: "Food & Grocery", icon: "☕", aliases: ["cafe"] },
  { id: "fast-food-street-food", name: "Fast Food / Street Food", group: "Food & Grocery", icon: "🌮", aliases: ["fast food", "street food"] },
  { id: "tea-juice-shop", name: "Tea & Juice Shop", group: "Food & Grocery", icon: "🧃", aliases: ["tea", "juice shop"] },
  { id: "ice-cream-shop", name: "Ice Cream Shop", group: "Food & Grocery", icon: "🍦", aliases: ["ice cream"] },
  { id: "meat-fish-shop", name: "Meat & Fish Shop", group: "Food & Grocery", icon: "🐟", aliases: ["meat", "fish shop"] },
  { id: "snacks-namkeen", name: "Snacks & Namkeen", group: "Food & Grocery", icon: "🥨", aliases: ["namkeen", "snacks"] },

  { id: "medical-store-pharmacy", name: "Medical Store / Pharmacy", group: "Medical & Healthcare", icon: "💊", aliases: ["pharmacy", "medical store"] },
  { id: "clinic", name: "Clinic", group: "Medical & Healthcare", icon: "🩺", aliases: ["clinic"] },
  { id: "diagnostic-lab", name: "Diagnostic Lab", group: "Medical & Healthcare", icon: "🧪", aliases: ["lab", "diagnostic"] },
  { id: "optical-store", name: "Optical Store", group: "Medical & Healthcare", icon: "🕶️", aliases: ["optical"] },
  { id: "healthcare-supplies", name: "Healthcare Supplies", group: "Medical & Healthcare", icon: "🩹", aliases: ["healthcare"] },

  { id: "clothing-garments", name: "Clothing / Garments", group: "Fashion & Lifestyle", icon: "👕", aliases: ["garments", "clothing"] },
  { id: "footwear", name: "Footwear", group: "Fashion & Lifestyle", icon: "👟", aliases: ["shoes", "footwear"] },
  { id: "cosmetics-beauty", name: "Cosmetics & Beauty", group: "Fashion & Lifestyle", icon: "💄", aliases: ["beauty", "cosmetics"] },
  { id: "jewellery", name: "Jewellery", group: "Fashion & Lifestyle", icon: "💍", aliases: ["jewelry", "jewellery"] },
  { id: "bags-accessories", name: "Bags & Accessories", group: "Fashion & Lifestyle", icon: "👜", aliases: ["bags", "accessories"] },
  { id: "tailoring-shop", name: "Tailoring Shop", group: "Fashion & Lifestyle", icon: "🧵", aliases: ["tailoring"] },

  { id: "electronics-store", name: "Electronics Store", group: "Electronics & Technology", icon: "📺", aliases: ["electronics"] },
  { id: "mobile-shop", name: "Mobile Shop", group: "Electronics & Technology", icon: "📱", aliases: ["mobile"] },
  { id: "computer-laptop-store", name: "Computer & Laptop Store", group: "Electronics & Technology", icon: "💻", aliases: ["computer", "laptop store"] },
  { id: "mobile-accessories", name: "Mobile Accessories", group: "Electronics & Technology", icon: "🔌", aliases: ["mobile accessory"] },
  { id: "electrical-supplies", name: "Electrical Supplies", group: "Electronics & Technology", icon: "💡", aliases: ["electrical"] },
  { id: "home-appliances", name: "Home Appliances", group: "Electronics & Technology", icon: "🏠", aliases: ["appliances"] },

  { id: "hardware-store", name: "Hardware Store", group: "Home & Construction", icon: "🧰", aliases: ["hardware"] },
  { id: "paint-store", name: "Paint Store", group: "Home & Construction", icon: "🎨", aliases: ["paint"] },
  { id: "furniture-store", name: "Furniture Store", group: "Home & Construction", icon: "🪑", aliases: ["furniture"] },
  { id: "home-decor", name: "Home Decor", group: "Home & Construction", icon: "🪴", aliases: ["decor"] },
  { id: "kitchenware-utensils", name: "Kitchenware & Utensils", group: "Home & Construction", icon: "🍴", aliases: ["kitchenware", "utensils"] },
  { id: "sanitary-plumbing", name: "Sanitary & Plumbing", group: "Home & Construction", icon: "🚿", aliases: ["plumbing", "sanitary"] },
  { id: "building-materials", name: "Building Materials", group: "Home & Construction", icon: "🧱", aliases: ["construction materials"] },

  { id: "stationery-shop", name: "Stationery Shop", group: "Education & Stationery", icon: "📚", aliases: ["stationery"] },
  { id: "book-store", name: "Book Store", group: "Education & Stationery", icon: "📖", aliases: ["books"] },
  { id: "photocopy-printing", name: "Photocopy & Printing", group: "Education & Stationery", icon: "🖨️", aliases: ["printing", "photocopy"] },
  { id: "gift-shop", name: "Gift Shop", group: "Education & Stationery", icon: "🎁", aliases: ["gift"] },
  { id: "toys-games", name: "Toys & Games", group: "Education & Stationery", icon: "🧸", aliases: ["toys"] },

  { id: "thela-street-vendor", name: "Thela / Street Vendor", group: "Local & Street Businesses", icon: "🛺", aliases: ["thela", "street vendor"] },
  { id: "street-food-vendor", name: "Street Food Vendor", group: "Local & Street Businesses", icon: "🍢", aliases: ["street food vendor"] },
  { id: "roadside-stall", name: "Roadside Stall", group: "Local & Street Businesses", icon: "🧺", aliases: ["stall"] },
  { id: "local-market-seller", name: "Local Market Seller", group: "Local & Street Businesses", icon: "🧾", aliases: ["market seller"] },
  { id: "flower-shop", name: "Flower Shop", group: "Local & Street Businesses", icon: "🌼", aliases: ["flowers"] },
  { id: "paan-shop", name: "Paan Shop", group: "Local & Street Businesses", icon: "🍃", aliases: ["paan"] },

  { id: "pet-supplies", name: "Pet Supplies", group: "Other Local Businesses", icon: "🐾", aliases: ["pet"] },
  { id: "sports-fitness-store", name: "Sports & Fitness Store", group: "Other Local Businesses", icon: "🏋️", aliases: ["sports", "fitness"] },
  { id: "automobile-accessories", name: "Automobile Accessories", group: "Other Local Businesses", icon: "🛠️", aliases: ["automobile"] },
  { id: "cycle-shop", name: "Cycle Shop", group: "Other Local Businesses", icon: "🚲", aliases: ["cycle"] },
  { id: "repair-maintenance", name: "Repair & Maintenance", group: "Other Local Businesses", icon: "🔧", aliases: ["repair", "maintenance"] },
  { id: "laundry-dry-cleaning", name: "Laundry & Dry Cleaning", group: "Other Local Businesses", icon: "🧺", aliases: ["laundry", "dry cleaning"] },
  { id: "other", name: "Other", group: "Other Local Businesses", icon: "✨", aliases: ["other local business"] },
];

export const BUSINESS_CATEGORY_MAP = Object.fromEntries(BUSINESS_CATEGORIES.map((category) => [category.id, category])) as Record<string, BusinessCategory>;

export const getBusinessCategoryById = (categoryId?: string | null): BusinessCategory | null => {
  if (!categoryId) return null;
  return BUSINESS_CATEGORY_MAP[categoryId] ?? null;
};

export const getBusinessCategoryByName = (categoryName?: string | null): BusinessCategory | null => {
  if (!categoryName) return null;

  const normalized = categoryName.trim().toLowerCase();
  const match = BUSINESS_CATEGORIES.find((category) => {
    if (category.name.toLowerCase() === normalized) return true;
    return category.aliases.some((alias) => alias.toLowerCase() === normalized);
  });

  return match ?? null;
};

export const getBusinessCategoryTitle = (category: BusinessCategory | null | undefined, fallback = "Local Business") => {
  if (!category) return fallback;
  return category.name;
};
