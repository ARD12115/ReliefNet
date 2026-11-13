import React from 'react';
import { 
  Utensils, 
  Droplet, 
  Pill, 
  Home, 
  Package 
} from 'lucide-react';

const categoryIcons = {
  food: Utensils,
  water: Droplet,
  medicine: Pill,
  shelter: Home,
  other: Package
};

export const CategoryIcon = ({ category, className = "w-6 h-6" }) => {
  const Icon = categoryIcons[category] || Package;
  return <Icon className={className} />;
};