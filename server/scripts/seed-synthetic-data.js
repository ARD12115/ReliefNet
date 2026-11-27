#!/usr/bin/env node
/**
 * Synthetic Data Generator for ReliefNet
 * Generates unique camps and inventory/ration data
 * Run with: node scripts/seed-synthetic-data.js
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import Camp from '../src/models/Camp.js';
import InventoryItem from '../src/models/InventoryItem.js';
import User from '../src/models/User.js';
import { sequelize } from '../src/config/db.js';

dotenv.config();

// ============================================
// UNIQUE DATA POOLS
// ============================================

// Camp name components for unique combinations
const CAMP_PREFIXES = [
  'North', 'South', 'East', 'West', 'Central', 'Upper', 'Lower', 'New', 'Old',
  'Green', 'Blue', 'Red', 'White', 'Golden', 'Silver', 'Crystal', 'Emerald',
  'Sunrise', 'Sunset', 'Mountain', 'Valley', 'River', 'Lake', 'Forest', 'Desert',
  'Coastal', 'Inland', 'Highland', 'Lowland', 'Frontier', 'Border', 'Gateway'
];

const CAMP_TYPES = [
  'Relief Camp', 'Refugee Camp', 'Displacement Center', 'Emergency Shelter',
  'Humanitarian Hub', 'Aid Distribution Point', 'Transit Center', 'Settlement',
  'Safe Zone', 'Recovery Camp', 'Medical Camp', 'Family Camp', 'Youth Camp'
];

const REGIONS = [
  { name: 'Northern Province', latBase: 35.5, lngBase: -90.0, spread: 2.0 },
  { name: 'Southern Province', latBase: 31.0, lngBase: -92.0, spread: 2.0 },
  { name: 'Eastern Region', latBase: 33.5, lngBase: -86.0, spread: 1.5 },
  { name: 'Western Region', latBase: 33.5, lngBase: -97.0, spread: 1.5 },
  { name: 'Central Highlands', latBase: 34.0, lngBase: -89.5, spread: 1.0 },
  { name: 'Coastal Plains', latBase: 30.5, lngBase: -88.0, spread: 1.5 },
  { name: 'River Valley', latBase: 32.5, lngBase: -91.0, spread: 1.2 },
  { name: 'Mountain Zone', latBase: 36.0, lngBase: -93.0, spread: 1.0 },
];

// Unique street/address components
const STREET_NAMES = [
  'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Willow', 'Birch', 'Aspen', 'Spruce', 'Fir',
  'River', 'Lake', 'Mountain', 'Valley', 'Hill', 'Ridge', 'Creek', 'Stream', 'Brook', 'Falls',
  'Sunrise', 'Sunset', 'Horizon', 'Meadow', 'Field', 'Plain', 'Prairie', 'Savanna', 'Desert', 'Oasis',
  'Harbor', 'Port', 'Bay', 'Cove', 'Inlet', 'Lagoon', 'Reef', 'Shore', 'Beach', 'Dune',
  'Liberty', 'Freedom', 'Hope', 'Peace', 'Unity', 'Harmony', 'Justice', 'Courage', 'Strength', 'Resilience',
  'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Main', 'Central', 'Primary', 'Principal', 'Major',
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
  'Redwood', 'Sequoia', 'Cypress', 'Juniper', 'Hemlock', 'Magnolia', 'Dogwood', 'Cherry', 'Apple', 'Pear',
];

const STREET_TYPES = ['St', 'Ave', 'Rd', 'Blvd', 'Dr', 'Ln', 'Ct', 'Pl', 'Way', 'Trl', 'Cir', 'Pkwy', 'Hwy', 'Byp'];

const CITIES = [
  'Springfield', 'Franklin', 'Georgetown', 'Clinton', 'Madison', 'Salem', 'Arlington', 'Greenville',
  'Fairview', 'Bristol', 'Lexington', 'Manchester', 'Wilmington', 'Concord', 'Augusta', 'Dover',
  'Riverside', 'Lakeside', 'Mountain View', 'Valley Forge', 'Hilltop', 'Ridgeline', 'Creekside', 'Brookfield',
  'Sunrise City', 'Sunset Valley', 'Horizon Hills', 'Meadowbrook', 'Plainfield', 'Prairieton', 'Savannah', 'Oasis Springs',
  'Harbor Town', 'Portside', 'Bayview', 'Cove Creek', 'Inlet Bay', 'Lagoon Shores', 'Reef Point', 'Shoreline', 'Beachwood', 'Dune Ridge',
];

const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

// Contact person names
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen',
  'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah',
  'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia',
  'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen',
  'Stephen', 'Anna', 'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Gregory', 'Christine', 'Alexander', 'Debra', 'Patrick', 'Rachel',
  'Frank', 'Catherine', 'Raymond', 'Carolyn', 'Jack', 'Janet', 'Dennis', 'Ruth', 'Jerry', 'Maria',
  'Tyler', 'Heather', 'Aaron', 'Diane', 'Jose', 'Virginia', 'Adam', 'Julie', 'Nathan', 'Joyce',
  'Henry', 'Victoria', 'Douglas', 'Olivia', 'Zachary', 'Kelly', 'Peter', 'Christina', 'Kyle', 'Joan',
  'Noah', 'Evelyn', 'Jeremy', 'Lauren', 'Walter', 'Judith', 'Ethan', 'Megan', 'Aaron', 'Cheryl',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
  'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez',
];

// Phone area codes
const AREA_CODES = ['202', '203', '205', '206', '207', '208', '209', '210', '212', '213', '214', '215', '216', '217', '218', '219', '220', '224', '225', '228', '229', '231', '234', '239', '240', '248', '251', '252', '253', '254', '256', '260', '262', '267', '269', '270', '272', '274', '276', '281', '283', '301', '302', '303', '304', '305', '307', '308', '309', '310', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '323', '325', '326', '330', '331', '332', '334', '336', '337', '339', '346', '347', '351', '352', '360', '361', '364', '380', '385', '386', '401', '402', '404', '405', '406', '407', '408', '409', '410', '412', '413', '414', '415', '417', '419', '423', '424', '425', '430', '432', '434', '435', '437', '438', '440', '442', '443', '445', '447', '448', '458', '463', '464', '468', '469', '470', '472', '475', '478', '479', '480', '484', '501', '502', '503', '504', '505', '507', '508', '509', '510', '512', '513', '515', '516', '517', '518', '520', '530', '531', '534', '539', '540', '541', '551', '559', '561', '562', '563', '564', '567', '570', '571', '573', '574', '575', '580', '582', '585', '586', '601', '602', '603', '605', '606', '607', '608', '609', '610', '612', '614', '615', '616', '617', '618', '619', '620', '623', '626', '628', '629', '630', '631', '636', '640', '641', '646', '650', '651', '656', '657', '659', '660', '661', '662', '667', '669', '678', '680', '681', '682', '689', '701', '702', '703', '704', '706', '707', '708', '712', '713', '714', '715', '716', '717', '718', '719', '720', '724', '725', '726', '727', '730', '731', '732', '734', '737', '740', '743', '747', '754', '757', '760', '762', '763', '765', '769', '770', '771', '772', '773', '774', '775', '779', '781', '785', '786', '801', '802', '803', '804', '805', '806', '808', '810', '812', '813', '814', '815', '816', '817', '818', '820', '826', '828', '830', '831', '832', '838', '840', '843', '845', '847', '848', '850', '854', '856', '857', '858', '859', '860', '862', '863', '864', '865', '870', '872', '878', '901', '903', '904', '906', '907', '908', '909', '910', '912', '913', '914', '915', '916', '917', '918', '919', '920', '925', '928', '929', '930', '931', '934', '936', '937', '938', '940', '941', '943', '945', '947', '949', '951', '952', '954', '956', '959', '970', '971', '972', '973', '975', '978', '979', '980', '984', '985', '986', '989'];

// Inventory item names by category - unique per item
const ITEM_NAMES = {
  food: [
    'Premium Rice Bags', 'Long Grain White Rice', 'Basmati Rice Sacks', 'Jasmine Rice Packs', 'Brown Rice Crates',
    'Wheat Flour Sacks', 'Whole Wheat Flour', 'All-Purpose Flour', 'Bread Flour Packs', 'Self-Rising Flour',
    'Canned Beans (Mixed)', 'Black Beans Cans', 'Kidney Beans Cans', 'Chickpeas Cans', 'Lentils Dried',
    'Canned Tuna', 'Canned Salmon', 'Canned Sardines', 'Canned Mackerel', 'Canned Anchovies',
    'Instant Noodles', 'Ramen Packets', 'Pasta Spaghetti', 'Pasta Penne', 'Pasta Macaroni',
    'Cooking Oil (Vegetable)', 'Olive Oil Bottles', 'Sunflower Oil', 'Coconut Oil', 'Palm Oil',
    'Sugar (White)', 'Brown Sugar', 'Powdered Sugar', 'Honey Jars', 'Maple Syrup',
    'Salt (Iodized)', 'Sea Salt', 'Rock Salt', 'Seasoning Packs', 'Bouillon Cubes',
    'Canned Tomatoes', 'Tomato Paste', 'Tomato Sauce', 'Diced Tomatoes', 'Crushed Tomatoes',
    'Powdered Milk', 'Evaporated Milk', 'Condensed Milk', 'Infant Formula', 'Soy Milk',
    'Breakfast Cereal', 'Oats Rolled', 'Corn Flakes', 'Granola Bars', 'Protein Bars',
    'Canned Vegetables', 'Mixed Vegetables', 'Green Beans', 'Corn Kernels', 'Peas Canned',
    'Peanut Butter', 'Almond Butter', 'Jam Strawberry', 'Jam Apricot', 'Marmalade',
    'Crackers Saltine', 'Water Crackers', 'Rice Cakes', 'Tortillas Flour', 'Tortillas Corn',
    'Dried Fruit Mix', 'Raisins Packs', 'Apricots Dried', 'Dates Packs', 'Prunes Packs',
    'Energy Biscuits', 'High-Energy Bars', 'Survival Rations', 'MRE Meals', 'Emergency Food Kits',
  ],
  water: [
    'Bottled Water (500ml)', 'Bottled Water (1L)', 'Bottled Water (5L)', 'Water Jugs (10L)', 'Water Drums (20L)',
    'Water Purification Tablets', 'Water Filter Straws', 'Ceramic Water Filters', 'UV Purifiers', 'Chlorine Drops',
    'Collapsible Water Containers', 'Water Bladders (5L)', 'Water Bladders (10L)', 'Jerry Cans (10L)', 'Jerry Cans (20L)',
    'Water Tank (500L)', 'Water Tank (1000L)', 'Water Tank (5000L)', 'Portable Water Tanks', 'Modular Water Storage',
    'Hand Pump Kits', 'Solar Water Pumps', 'Water Testing Kits', 'pH Test Strips', 'Turbidity Tubes',
    'Rainwater Harvesting Kits', 'Gutter Filters', 'First Flush Diverters', 'Storage Cisterns', 'Underground Tanks',
    'Water Trucks (Small)', 'Water Trucks (Medium)', 'Water Trucks (Large)', 'Distribution Hoses', 'Tap Stands',
    'Water Points (Community)', 'Emergency Water Stations', 'Mobile Treatment Units', 'Desalination Units', 'Brackish Water Filters',
  ],
  medicine: [
    'Paracetamol 500mg', 'Ibuprofen 400mg', 'Aspirin 300mg', 'Acetaminophen 325mg', 'Naproxen 250mg',
    'Amoxicillin 500mg', 'Azithromycin 250mg', 'Ciprofloxacin 500mg', 'Doxycycline 100mg', 'Metronidazole 400mg',
    'ORS Sachets', 'Zinc Tablets', 'Vitamin A Capsules', 'Vitamin D Drops', 'Multivitamin Tablets',
    'Bandages (Roll)', 'Gauze Pads', 'Adhesive Tape', 'Antiseptic Solution', 'Cotton Wool',
    'Syringes (5ml)', 'Syringes (10ml)', 'Needles (23G)', 'Needles (25G)', 'IV Cannulas',
    'IV Fluids (Normal Saline)', 'IV Fluids (Ringer Lactate)', 'IV Fluids (Dextrose 5%)', 'IV Fluids (Dextrose 10%)', 'Blood Transfusion Sets',
    'Surgical Gloves', 'Examination Gloves', 'Face Masks (Surgical)', 'N95 Respirators', 'Face Shields',
    'Thermometers (Digital)', 'Blood Pressure Monitors', 'Pulse Oximeters', 'Stethoscopes', 'Glucometers',
    'Antimalarial (ACT)', 'Antimalarial (Chloroquine)', 'Antimalarial (Primaquine)', 'TB Drugs (Fixed Dose)', 'HIV Test Kits',
    'Pregnancy Test Kits', 'Malaria RDTs', 'HIV Rapid Tests', 'Syphilis Test Kits', 'Hepatitis B Tests',
    'Insulin Vials', 'Insulin Syringes', 'Test Strips', 'Lancets', 'Sharps Containers',
    'Oxygen Concentrators', 'Oxygen Cylinders', 'Nebulizers', 'Suction Machines', 'Ventilators (Portable)',
    'First Aid Kits (Basic)', 'First Aid Kits (Advanced)', 'Trauma Kits', 'Burn Kits', 'Snake Bite Kits',
    'Cold Chain Boxes', 'Vaccine Carriers', 'Ice Packs', 'Temperature Loggers', 'Freeze Indicators',
  ],
  shelter: [
    'Family Tents (4-person)', 'Family Tents (6-person)', 'Family Tents (8-person)', 'Emergency Shelters', 'Refugee Housing Units',
    'Tarpaulins (4x6m)', 'Tarpaulins (6x8m)', 'Tarpaulins (10x12m)', 'Heavy Duty Tarps', 'Reinforced Tarps',
    'Blankets (Wool)', 'Blankets (Fleece)', 'Blankets (Thermal)', 'Emergency Blankets', 'Sleeping Bags',
    'Sleeping Mats (Foam)', 'Sleeping Mats (Inflatable)', 'Ground Sheets', 'Mosquito Nets (Single)', 'Mosquito Nets (Family)',
    'Kitchen Sets (Family)', 'Cooking Stoves (Portable)', 'Fuel Canisters', 'Solar Lanterns', 'LED Lanterns',
    'Water Buckets (10L)', 'Water Buckets (20L)', 'Wash Basins', 'Laundry Lines', 'Clothes Pegs',
    'Tool Kits (Shelter)', 'Hammer & Nails', 'Rope (50m)', 'Wire (Galvanized)', 'Shovels',
    'Partition Screens', 'Privacy Curtains', 'Door Flaps', 'Ventilation Pipes', 'Stove Pipes',
    'Insulation Kits', 'Floor Matting', 'Raised Platforms', 'Drainage Channels', 'Sandbags',
    'Transitional Shelters', 'Core Houses', 'Shelter Kits (Winter)', 'Shelter Kits (Summer)', 'Modular Housing',
  ],
  clothing: [
    'T-Shirts (Adult M)', 'T-Shirts (Adult L)', 'T-Shirts (Adult XL)', 'T-Shirts (Child S)', 'T-Shirts (Child M)',
    'Long Sleeve Shirts', 'Thermal Underwear (Top)', 'Thermal Underwear (Bottom)', 'Fleece Jackets', 'Waterproof Jackets',
    'Pants (Adult M)', 'Pants (Adult L)', 'Pants (Adult XL)', 'Pants (Child S)', 'Pants (Child M)',
    'Shorts (Adult)', 'Shorts (Child)', 'Skirts (Adult)', 'Dresses (Child)', 'Traditional Wear',
    'Underwear (Men M)', 'Underwear (Men L)', 'Underwear (Women M)', 'Underwear (Women L)', 'Children Underwear',
    'Socks (Pairs)', 'Socks (Wool)', 'Socks (Thermal)', 'Stockings', 'Compression Socks',
    'Shoes (Adult 40)', 'Shoes (Adult 42)', 'Shoes (Adult 44)', 'Shoes (Child 30)', 'Shoes (Child 32)',
    'Sandals (Adult)', 'Sandals (Child)', 'Boots (Rubber)', 'Boots (Leather)', 'Boots (Winter)',
    'Hats (Sun)', 'Hats (Winter)', 'Beanies', 'Caps (Baseball)', 'Headscarves',
    'Gloves (Work)', 'Gloves (Winter)', 'Gloves (Surgical)', 'Mittens', 'Hand Warmers',
    'Scarves', 'Shawls', 'Ponchos (Rain)', 'Ponchos (Emergency)', 'Reflective Vests',
    'Baby Clothing Sets', 'Baby Blankets', 'Baby Hats', 'Baby Socks', 'Baby Mittens',
  ],
  sanitation: [
    'Soap Bars (100g)', 'Liquid Soap (500ml)', 'Hand Sanitizer (100ml)', 'Hand Sanitizer (500ml)', 'Antibacterial Wipes',
    'Toothbrushes (Adult)', 'Toothbrushes (Child)', 'Toothpaste (100g)', 'Toothpaste (50g)', 'Dental Floss',
    'Sanitary Pads (Pack 10)', 'Sanitary Pads (Pack 20)', 'Tampons (Pack 16)', 'Menstrual Cups', 'Period Underwear',
    'Diapers (Newborn)', 'Diapers (Small)', 'Diapers (Medium)', 'Diapers (Large)', 'Adult Diapers',
    'Baby Wipes (Pack)', 'Wet Wipes (Antibacterial)', 'Tissues (Box)', 'Toilet Paper (Roll)', 'Toilet Paper (Pack)',
    'Laundry Detergent (1kg)', 'Laundry Detergent (500g)', 'Bleach (1L)', 'Disinfectant (1L)', 'Floor Cleaner',
    'Trash Bags (Large)', 'Trash Bags (Medium)', 'Biohazard Bags', 'Sharps Containers', 'Waste Bins',
    'Latrine Slabs', 'Latrine Superstructures', 'Handwashing Stations', 'Soap Dispensers', 'Towel Rolls',
    'Shower Tents', 'Shower Heads', 'Drainage Pipes', 'Septic Tank Kits', 'Composting Toilets',
    'Insecticide Spray', 'Mosquito Coils', 'Larvicide', 'Bed Net Treatment', 'Fogging Machines',
    'Cleaning Kits (Family)', 'Hygiene Kits (Women)', 'Hygiene Kits (Men)', 'Hygiene Kits (Baby)', 'Dignity Kits',
  ],
  other: [
    'Solar Panels (50W)', 'Solar Panels (100W)', 'Solar Panels (200W)', 'Battery Packs (Power Bank)', 'Battery Packs (Deep Cycle)',
    'LED Bulbs (12V)', 'LED Strip Lights', 'Flashlights (LED)', 'Headlamps (LED)', 'Rechargeable Batteries',
    'Phone Chargers (Solar)', 'Phone Chargers (USB)', 'Power Strips', 'Extension Cords', 'Adapters (Universal)',
    'Radio (Wind-up)', 'Radio (Solar)', 'Radio (Battery)', 'Walkie Talkies', 'Satellite Phones',
    'Laptop (Rugged)', 'Tablet (Rugged)', 'Printer (Portable)', 'Scanner (Document)', 'Projector (Pico)',
    'Whiteboards (Portable)', 'Markers (Set)', 'Flip Charts', 'Notebooks (A4)', 'Pens (Box)',
    'Forms (Assessment)', 'Forms (Registration)', 'Forms (Distribution)', 'Clipboards', 'Folders',
    'Megaphones', 'Whistles', 'Flags (Signal)', 'Vests (High-Vis)', 'Hard Hats',
    'First Aid Manuals', 'Health Education Posters', 'IEC Materials', 'Training Kits', 'Simulation Kits',
    'Generator (5kW)', 'Generator (10kW)', 'Fuel Cans (20L)', 'Fuel Stabilizer', 'Oil (Engine)',
    'Tool Kit (Mechanic)', 'Tool Kit (Electrician)', 'Tool Kit (Plumber)', 'Multi-tools', 'Leatherman',
    'Maps (Regional)', 'GPS Units', 'Compasses', 'Binoculars', 'Range Finders',
  ],
};

// Units by category - must match database enum: units, kg, liters, boxes, packs, bottles, rolls, meters
const UNITS_BY_CATEGORY = {
  food: ['kg', 'packs', 'boxes', 'bottles', 'units'],
  water: ['liters', 'bottles', 'units'],
  medicine: ['units', 'boxes', 'packs', 'bottles', 'rolls'],
  shelter: ['units', 'rolls', 'meters'],
  clothing: ['units', 'packs'],
  sanitation: ['units', 'packs', 'boxes', 'rolls', 'bottles', 'liters'],
  other: ['units', 'packs', 'boxes'],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getUniqueRandomElements(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

function generateUniqueName(prefixes, types, usedNames) {
  let attempts = 0;
  while (attempts < 100) {
    const prefix = getRandomElement(prefixes);
    const type = getRandomElement(types);
    const name = `${prefix} ${type} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  // Fallback
  const fallback = `${getRandomElement(prefixes)} ${getRandomElement(types)} ${Date.now().toString(36).toUpperCase()}`;
  usedNames.add(fallback);
  return fallback;
}

function generatePhoneNumber() {
  const areaCode = getRandomElement(AREA_CODES);
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `+1-${areaCode}-${prefix}-${line}`;
}

function generateEmail(name, campName) {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  const cleanCamp = campName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '').substring(0, 10);
  const domains = ['reliefnet.org', 'aidorg.org', 'humanitarian.org', 'disaster-response.org', 'emergency-aid.org'];
  return `${cleanName}.${cleanCamp}@${getRandomElement(domains)}`;
}

function generateAddress() {
  const number = Math.floor(Math.random() * 9999) + 1;
  const street = getRandomElement(STREET_NAMES);
  const type = getRandomElement(STREET_TYPES);
  const city = getRandomElement(CITIES);
  const state = getRandomElement(STATES);
  const zip = Math.floor(Math.random() * 90000) + 10000;
  return `${number} ${street} ${type}, ${city}, ${state} ${zip}`;
}

function generateCoordinates(region) {
  const lat = region.latBase + (Math.random() - 0.5) * region.spread * 2;
  const lng = region.lngBase + (Math.random() - 0.5) * region.spread * 2;
  return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
}

function generateBatchNumber(category) {
  const prefix = category.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const batch = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const serial = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${year}-${batch}-${serial}`;
}

function generateExpiryDate() {
  const days = Math.floor(Math.random() * 730) + 30; // 30 days to 2 years
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedDatabase() {
  console.log('🌱 Starting synthetic data generation...\n');
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Ensure tables exist
    console.log('🔧 Syncing database schema...');
    await sequelize.sync({ alter: true });
    console.log('✅ Schema synced\n');

    // Clear existing data (optional - comment out to preserve)
    console.log('🧹 Clearing existing data...');
    await InventoryItem.destroy({ where: {}, force: true });
    await Camp.destroy({ where: {}, force: true });
    console.log('✅ Existing data cleared\n');

    // Generate unique camps
    console.log('🏕️  Generating camps...');
    const usedCampNames = new Set();
    const camps = [];
    const campCount = 25; // Generate 25 unique camps

    for (let i = 0; i < campCount; i++) {
      const region = REGIONS[i % REGIONS.length];
      const coords = generateCoordinates(region);
      const name = generateUniqueName(CAMP_PREFIXES, CAMP_TYPES, usedCampNames);
      const capacity = [100, 150, 200, 250, 300, 350, 400, 500, 600, 800, 1000][Math.floor(Math.random() * 11)];
      const occupancyRate = 0.3 + Math.random() * 0.6; // 30-90% occupancy
      const currentPopulation = Math.floor(capacity * occupancyRate);
      
      const contactPerson = `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`;
      const contactPhone = generatePhoneNumber();
      const contactEmail = generateEmail(contactPerson, name);

      const camp = await Camp.create({
        name,
        latitude: coords.lat,
        longitude: coords.lng,
        address: generateAddress(),
        capacity,
        currentPopulation,
        contactPerson,
        contactPhone,
        contactEmail,
        status: ['active', 'active', 'active', 'active', 'inactive', 'full'][Math.floor(Math.random() * 6)],
        managedBy: null, // Will be assigned if users exist
      });

      camps.push(camp);
      console.log(`  ✅ ${name} (${currentPopulation}/${capacity}) at ${coords.lat}, ${coords.lng}`);
    }

    console.log(`\n📦 Generating inventory items for ${camps.length} camps...`);

    // Generate inventory items for each camp
    const categories = Object.keys(ITEM_NAMES);
    let totalItems = 0;

    for (const camp of camps) {
      // Each camp gets 15-35 unique items across categories
      const itemCount = 15 + Math.floor(Math.random() * 21);
      const usedItemNames = new Set();

      for (let i = 0; i < itemCount; i++) {
        const category = getRandomElement(categories);
        const availableNames = ITEM_NAMES[category].filter(n => !usedItemNames.has(n));
        
        if (availableNames.length === 0) continue;

        const itemName = getRandomElement(availableNames);
        usedItemNames.add(itemName);

        const unit = getRandomElement(UNITS_BY_CATEGORY[category]);
        const baseQuantity = category === 'water' ? 500 : category === 'medicine' ? 50 : 100;
        const quantity = Math.floor(baseQuantity * (0.5 + Math.random() * 3)); // 0.5x to 3.5x base
        const minimumThreshold = Math.max(5, Math.floor(quantity * (0.1 + Math.random() * 0.2))); // 10-30% of quantity
        const reservedQuantity = Math.floor(Math.random() * Math.min(20, quantity * 0.1));

        await InventoryItem.create({
          campId: camp.id,
          category,
          itemName,
          quantity,
          unit,
          minimumThreshold,
          reservedQuantity,
          expiryDate: generateExpiryDate(),
          batchNumber: generateBatchNumber(category),
          notes: `Batch: ${generateBatchNumber(category)} | Supplied: ${new Date().toLocaleDateString()}`,
          lastUpdatedBy: null,
        });

        totalItems++;
      }

      console.log(`  ✅ ${camp.name}: ${itemCount} items`);
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   Camps created: ${camps.length}`);
    console.log(`   Inventory items: ${totalItems}`);
    console.log(`   Categories covered: ${categories.join(', ')}`);

    // Verify unique constraints
    console.log('\n🔍 Verifying uniqueness...');
    const campNames = await Camp.findAll({ attributes: ['name'], raw: true });
    const uniqueCampNames = new Set(campNames.map(c => c.name));
    console.log(`   Unique camp names: ${uniqueCampNames.size}/${camps.length}`);

    const itemNames = await InventoryItem.findAll({ attributes: ['campId', 'category', 'itemName'], raw: true });
    const uniqueItems = new Set(itemNames.map(i => `${i.campId}-${i.category}-${i.itemName}`));
    console.log(`   Unique camp-category-item combos: ${uniqueItems.size}/${itemNames.length}`);

    // Summary stats
    const categoryCounts = {};
    for (const item of itemNames) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }
    console.log('\n📊 Inventory by category:');
    for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${count} items`);
    }

    const statusCounts = {};
    for (const camp of camps) {
      statusCounts[camp.status] = (statusCounts[camp.status] || 0) + 1;
    }
    console.log('\n🏕️  Camps by status:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`   ${status}: ${count}`);
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
seedDatabase()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });