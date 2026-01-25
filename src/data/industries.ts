// LinkedIn's official industry list (148 industries)
// Source: https://learn.microsoft.com/en-us/linkedin/shared/references/v2/standardized-data/industries

export interface IndustryItem {
  id: string;
  name: string;
  category: string;
}

export const INDUSTRY_CATEGORIES = [
  'Agriculture',
  'Arts & Entertainment',
  'Construction',
  'Consumer Goods',
  'Corporate Services',
  'Design',
  'Education',
  'Energy & Mining',
  'Finance',
  'Hardware & Networking',
  'Health Care',
  'Legal',
  'Manufacturing',
  'Media & Communications',
  'Nonprofit',
  'Public Administration',
  'Public Safety',
  'Real Estate',
  'Recreation & Travel',
  'Retail',
  'Software & IT Services',
  'Transportation & Logistics',
  'Wellness & Fitness',
] as const;

export type IndustryCategory = typeof INDUSTRY_CATEGORIES[number];

export const INDUSTRIES: IndustryItem[] = [
  // Agriculture
  { id: 'dairy', name: 'Dairy', category: 'Agriculture' },
  { id: 'farming', name: 'Farming', category: 'Agriculture' },
  { id: 'fishery', name: 'Fishery', category: 'Agriculture' },
  { id: 'ranching', name: 'Ranching', category: 'Agriculture' },
  
  // Arts & Entertainment
  { id: 'animation', name: 'Animation', category: 'Arts & Entertainment' },
  { id: 'broadcast_media', name: 'Broadcast Media', category: 'Arts & Entertainment' },
  { id: 'fine_art', name: 'Fine Art', category: 'Arts & Entertainment' },
  { id: 'motion_pictures_film', name: 'Motion Pictures & Film', category: 'Arts & Entertainment' },
  { id: 'music', name: 'Music', category: 'Arts & Entertainment' },
  { id: 'performing_arts', name: 'Performing Arts', category: 'Arts & Entertainment' },
  { id: 'photography', name: 'Photography', category: 'Arts & Entertainment' },
  { id: 'entertainment', name: 'Entertainment', category: 'Arts & Entertainment' },
  
  // Construction
  { id: 'building_materials', name: 'Building Materials', category: 'Construction' },
  { id: 'civil_engineering', name: 'Civil Engineering', category: 'Construction' },
  { id: 'construction', name: 'Construction', category: 'Construction' },
  
  // Consumer Goods
  { id: 'apparel_fashion', name: 'Apparel & Fashion', category: 'Consumer Goods' },
  { id: 'consumer_electronics', name: 'Consumer Electronics', category: 'Consumer Goods' },
  { id: 'consumer_goods', name: 'Consumer Goods', category: 'Consumer Goods' },
  { id: 'cosmetics', name: 'Cosmetics', category: 'Consumer Goods' },
  { id: 'food_beverages', name: 'Food & Beverages', category: 'Consumer Goods' },
  { id: 'furniture', name: 'Furniture', category: 'Consumer Goods' },
  { id: 'luxury_goods_jewelry', name: 'Luxury Goods & Jewelry', category: 'Consumer Goods' },
  { id: 'sporting_goods', name: 'Sporting Goods', category: 'Consumer Goods' },
  { id: 'tobacco', name: 'Tobacco', category: 'Consumer Goods' },
  { id: 'wine_spirits', name: 'Wine & Spirits', category: 'Consumer Goods' },
  
  // Corporate Services
  { id: 'accounting', name: 'Accounting', category: 'Corporate Services' },
  { id: 'business_supplies_equipment', name: 'Business Supplies & Equipment', category: 'Corporate Services' },
  { id: 'environmental_services', name: 'Environmental Services', category: 'Corporate Services' },
  { id: 'events_services', name: 'Events Services', category: 'Corporate Services' },
  { id: 'executive_office', name: 'Executive Office', category: 'Corporate Services' },
  { id: 'facilities_services', name: 'Facilities Services', category: 'Corporate Services' },
  { id: 'human_resources', name: 'Human Resources', category: 'Corporate Services' },
  { id: 'information_services', name: 'Information Services', category: 'Corporate Services' },
  { id: 'management_consulting', name: 'Management Consulting', category: 'Corporate Services' },
  { id: 'outsourcing_offshoring', name: 'Outsourcing/Offshoring', category: 'Corporate Services' },
  { id: 'professional_training_coaching', name: 'Professional Training & Coaching', category: 'Corporate Services' },
  { id: 'security_investigations', name: 'Security & Investigations', category: 'Corporate Services' },
  { id: 'staffing_recruiting', name: 'Staffing & Recruiting', category: 'Corporate Services' },
  
  // Design
  { id: 'architecture_planning', name: 'Architecture & Planning', category: 'Design' },
  { id: 'design', name: 'Design', category: 'Design' },
  { id: 'graphic_design', name: 'Graphic Design', category: 'Design' },
  { id: 'industrial_design', name: 'Industrial Design', category: 'Design' },
  { id: 'interior_design', name: 'Interior Design', category: 'Design' },
  
  // Education
  { id: 'education_management', name: 'Education Management', category: 'Education' },
  { id: 'e_learning', name: 'E-Learning', category: 'Education' },
  { id: 'higher_education', name: 'Higher Education', category: 'Education' },
  { id: 'primary_secondary_education', name: 'Primary/Secondary Education', category: 'Education' },
  { id: 'research', name: 'Research', category: 'Education' },
  
  // Energy & Mining
  { id: 'mining_metals', name: 'Mining & Metals', category: 'Energy & Mining' },
  { id: 'oil_energy', name: 'Oil & Energy', category: 'Energy & Mining' },
  { id: 'renewables_environment', name: 'Renewables & Environment', category: 'Energy & Mining' },
  { id: 'utilities', name: 'Utilities', category: 'Energy & Mining' },
  
  // Finance
  { id: 'banking', name: 'Banking', category: 'Finance' },
  { id: 'capital_markets', name: 'Capital Markets', category: 'Finance' },
  { id: 'financial_services', name: 'Financial Services', category: 'Finance' },
  { id: 'insurance', name: 'Insurance', category: 'Finance' },
  { id: 'investment_banking', name: 'Investment Banking', category: 'Finance' },
  { id: 'investment_management', name: 'Investment Management', category: 'Finance' },
  { id: 'venture_capital_private_equity', name: 'Venture Capital & Private Equity', category: 'Finance' },
  
  // Hardware & Networking
  { id: 'computer_hardware', name: 'Computer Hardware', category: 'Hardware & Networking' },
  { id: 'computer_networking', name: 'Computer Networking', category: 'Hardware & Networking' },
  { id: 'nanotechnology', name: 'Nanotechnology', category: 'Hardware & Networking' },
  { id: 'semiconductors', name: 'Semiconductors', category: 'Hardware & Networking' },
  { id: 'telecommunications', name: 'Telecommunications', category: 'Hardware & Networking' },
  { id: 'wireless', name: 'Wireless', category: 'Hardware & Networking' },
  
  // Health Care
  { id: 'alternative_medicine', name: 'Alternative Medicine', category: 'Health Care' },
  { id: 'biotechnology', name: 'Biotechnology', category: 'Health Care' },
  { id: 'hospital_health_care', name: 'Hospital & Health Care', category: 'Health Care' },
  { id: 'medical_devices', name: 'Medical Devices', category: 'Health Care' },
  { id: 'medical_practice', name: 'Medical Practice', category: 'Health Care' },
  { id: 'mental_health_care', name: 'Mental Health Care', category: 'Health Care' },
  { id: 'pharmaceuticals', name: 'Pharmaceuticals', category: 'Health Care' },
  { id: 'veterinary', name: 'Veterinary', category: 'Health Care' },
  
  // Legal
  { id: 'law_enforcement', name: 'Law Enforcement', category: 'Legal' },
  { id: 'law_practice', name: 'Law Practice', category: 'Legal' },
  { id: 'legal_services', name: 'Legal Services', category: 'Legal' },
  
  // Manufacturing
  { id: 'automotive', name: 'Automotive', category: 'Manufacturing' },
  { id: 'aviation_aerospace', name: 'Aviation & Aerospace', category: 'Manufacturing' },
  { id: 'chemicals', name: 'Chemicals', category: 'Manufacturing' },
  { id: 'defense_space', name: 'Defense & Space', category: 'Manufacturing' },
  { id: 'electrical_electronic_manufacturing', name: 'Electrical/Electronic Manufacturing', category: 'Manufacturing' },
  { id: 'food_production', name: 'Food Production', category: 'Manufacturing' },
  { id: 'glass_ceramics_concrete', name: 'Glass, Ceramics & Concrete', category: 'Manufacturing' },
  { id: 'industrial_automation', name: 'Industrial Automation', category: 'Manufacturing' },
  { id: 'machinery', name: 'Machinery', category: 'Manufacturing' },
  { id: 'mechanical_industrial_engineering', name: 'Mechanical or Industrial Engineering', category: 'Manufacturing' },
  { id: 'packaging_containers', name: 'Packaging & Containers', category: 'Manufacturing' },
  { id: 'paper_forest_products', name: 'Paper & Forest Products', category: 'Manufacturing' },
  { id: 'plastics', name: 'Plastics', category: 'Manufacturing' },
  { id: 'railroad_manufacture', name: 'Railroad Manufacture', category: 'Manufacturing' },
  { id: 'shipbuilding', name: 'Shipbuilding', category: 'Manufacturing' },
  { id: 'textiles', name: 'Textiles', category: 'Manufacturing' },
  
  // Media & Communications
  { id: 'market_research', name: 'Market Research', category: 'Media & Communications' },
  { id: 'marketing_advertising', name: 'Marketing & Advertising', category: 'Media & Communications' },
  { id: 'newspapers', name: 'Newspapers', category: 'Media & Communications' },
  { id: 'online_media', name: 'Online Media', category: 'Media & Communications' },
  { id: 'printing', name: 'Printing', category: 'Media & Communications' },
  { id: 'public_relations_communications', name: 'Public Relations & Communications', category: 'Media & Communications' },
  { id: 'publishing', name: 'Publishing', category: 'Media & Communications' },
  { id: 'translation_localization', name: 'Translation & Localization', category: 'Media & Communications' },
  { id: 'writing_editing', name: 'Writing & Editing', category: 'Media & Communications' },
  
  // Nonprofit
  { id: 'civic_social_organization', name: 'Civic & Social Organization', category: 'Nonprofit' },
  { id: 'fundraising', name: 'Fundraising', category: 'Nonprofit' },
  { id: 'individual_family_services', name: 'Individual & Family Services', category: 'Nonprofit' },
  { id: 'international_trade_development', name: 'International Trade & Development', category: 'Nonprofit' },
  { id: 'libraries', name: 'Libraries', category: 'Nonprofit' },
  { id: 'museums_institutions', name: 'Museums & Institutions', category: 'Nonprofit' },
  { id: 'nonprofit_organization_management', name: 'Nonprofit Organization Management', category: 'Nonprofit' },
  { id: 'philanthropy', name: 'Philanthropy', category: 'Nonprofit' },
  { id: 'program_development', name: 'Program Development', category: 'Nonprofit' },
  { id: 'religious_institutions', name: 'Religious Institutions', category: 'Nonprofit' },
  { id: 'think_tanks', name: 'Think Tanks', category: 'Nonprofit' },
  
  // Public Administration
  { id: 'government_administration', name: 'Government Administration', category: 'Public Administration' },
  { id: 'government_relations', name: 'Government Relations', category: 'Public Administration' },
  { id: 'international_affairs', name: 'International Affairs', category: 'Public Administration' },
  { id: 'judiciary', name: 'Judiciary', category: 'Public Administration' },
  { id: 'legislative_office', name: 'Legislative Office', category: 'Public Administration' },
  { id: 'political_organization', name: 'Political Organization', category: 'Public Administration' },
  { id: 'public_policy', name: 'Public Policy', category: 'Public Administration' },
  
  // Public Safety
  { id: 'military', name: 'Military', category: 'Public Safety' },
  { id: 'public_safety', name: 'Public Safety', category: 'Public Safety' },
  
  // Real Estate
  { id: 'commercial_real_estate', name: 'Commercial Real Estate', category: 'Real Estate' },
  { id: 'real_estate', name: 'Real Estate', category: 'Real Estate' },
  
  // Recreation & Travel
  { id: 'airlines_aviation', name: 'Airlines/Aviation', category: 'Recreation & Travel' },
  { id: 'gambling_casinos', name: 'Gambling & Casinos', category: 'Recreation & Travel' },
  { id: 'hospitality', name: 'Hospitality', category: 'Recreation & Travel' },
  { id: 'leisure_travel_tourism', name: 'Leisure, Travel & Tourism', category: 'Recreation & Travel' },
  { id: 'restaurants', name: 'Restaurants', category: 'Recreation & Travel' },
  { id: 'recreational_facilities_services', name: 'Recreational Facilities & Services', category: 'Recreation & Travel' },
  { id: 'sports', name: 'Sports', category: 'Recreation & Travel' },
  
  // Retail
  { id: 'retail', name: 'Retail', category: 'Retail' },
  { id: 'supermarkets', name: 'Supermarkets', category: 'Retail' },
  { id: 'wholesale', name: 'Wholesale', category: 'Retail' },
  
  // Software & IT Services
  { id: 'computer_games', name: 'Computer Games', category: 'Software & IT Services' },
  { id: 'computer_software', name: 'Computer Software', category: 'Software & IT Services' },
  { id: 'computer_network_security', name: 'Computer & Network Security', category: 'Software & IT Services' },
  { id: 'information_technology_services', name: 'Information Technology & Services', category: 'Software & IT Services' },
  { id: 'internet', name: 'Internet', category: 'Software & IT Services' },
  
  // Transportation & Logistics
  { id: 'import_export', name: 'Import & Export', category: 'Transportation & Logistics' },
  { id: 'logistics_supply_chain', name: 'Logistics & Supply Chain', category: 'Transportation & Logistics' },
  { id: 'maritime', name: 'Maritime', category: 'Transportation & Logistics' },
  { id: 'package_freight_delivery', name: 'Package/Freight Delivery', category: 'Transportation & Logistics' },
  { id: 'transportation_trucking_railroad', name: 'Transportation/Trucking/Railroad', category: 'Transportation & Logistics' },
  { id: 'warehousing', name: 'Warehousing', category: 'Transportation & Logistics' },
  
  // Wellness & Fitness
  { id: 'health_wellness_fitness', name: 'Health, Wellness & Fitness', category: 'Wellness & Fitness' },
  
  // Other
  { id: 'other', name: 'Other', category: 'Other' },
];

// Helper to get industry by ID
export function getIndustryById(id: string): IndustryItem | undefined {
  return INDUSTRIES.find(i => i.id === id);
}

// Helper to get industry name by ID
export function getIndustryName(id: string): string {
  return getIndustryById(id)?.name ?? id;
}

// Helper to get industries by category
export function getIndustriesByCategory(category: string): IndustryItem[] {
  return INDUSTRIES.filter(i => i.category === category);
}

// Group industries by category for display
export function getIndustriesGroupedByCategory(): Record<string, IndustryItem[]> {
  return INDUSTRIES.reduce((acc, industry) => {
    if (!acc[industry.category]) {
      acc[industry.category] = [];
    }
    acc[industry.category].push(industry);
    return acc;
  }, {} as Record<string, IndustryItem[]>);
}
