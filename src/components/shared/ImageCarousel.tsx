import React from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images, 
  alt, 
  className 
}) => {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt={alt}
        className={cn("w-full h-48 object-cover", className)}
      />
    );
  }

  return (
    <Carousel className="w-full relative">
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index}>
            <img
              src={image}
              alt={`${alt} - Imagem ${index + 1}`}
              className={cn("w-full h-48 object-cover", className)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 && (
        <>
          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-none h-8 w-8" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-none h-8 w-8" />
        </>
      )}
    </Carousel>
  );
};