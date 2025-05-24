
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Link } from "react-router-dom";

const CartButton = () => {
  const { cartCount } = useCart();

  return (
    <Button variant="outline" size="sm" asChild className="relative">
      <Link to="/cart">
        <ShoppingCart className="h-4 w-4" />
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {cartCount}
          </span>
        )}
        <span className="ml-2 hidden sm:inline">Carrinho</span>
      </Link>
    </Button>
  );
};

export default CartButton;
