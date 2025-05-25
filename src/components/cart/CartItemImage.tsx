
import React from "react";
import { Package, MapPin, ShoppingCart } from "lucide-react";

interface CartItemImageProps {
  itemType: 'room' | 'equipment' | 'product';
  itemName: string;
  imageUrl?: string;
}

export const CartItemImage: React.FC<CartItemImageProps> = ({ 
  itemType, 
  itemName, 
  imageUrl 
}) => {
  const getIcon = () => {
    switch (itemType) {
      case 'room':
        return <MapPin className="h-6 w-6" />;
      case 'equipment':
        return <Package className="h-6 w-6" />;
      case 'product':
        return <ShoppingCart className="h-6 w-6" />;
      default:
        return <Package className="h-6 w-6" />;
    }
  };

  const getIconColor = () => {
    switch (itemType) {
      case 'room':
        return "text-blue-600 bg-blue-100";
      case 'equipment':
        return "text-green-600 bg-green-100";
      case 'product':
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={itemName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`p-3 rounded-lg ${getIconColor()}`}>
          {getIcon()}
        </div>
      )}
    </div>
  );
};
