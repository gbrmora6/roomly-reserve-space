import React, { useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageModal } from "@/components/shared/ImageModal";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModalIndex, setCurrentModalIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    setCurrentIndex((prev) => prev === 0 ? images.length - 1 : prev - 1);
  }, [images.length]);

  const scrollNext = useCallback(() => {
    setCurrentIndex((prev) => prev === images.length - 1 ? 0 : prev + 1);
  }, [images.length]);

  const handleImageClick = useCallback((index: number) => {
    setCurrentModalIndex(index);
    setIsModalOpen(true);
  }, []);

  const handleModalPrevious = useCallback(() => {
    setCurrentModalIndex((prev) => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  }, [images.length]);

  const handleModalNext = useCallback(() => {
    setCurrentModalIndex((prev) => 
      prev === images.length - 1 ? 0 : prev + 1
    );
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <>
        <img
          src={images[0]}
          alt={alt}
          className={cn("w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity", className)}
          onClick={() => handleImageClick(0)}
        />
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          images={images}
          currentIndex={currentModalIndex}
          onPrevious={handleModalPrevious}
          onNext={handleModalNext}
          alt={alt}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-hidden">
        <div className="relative w-full h-48">
          <div 
            className="flex transition-transform duration-300 ease-in-out w-full h-full"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((image, index) => (
              <div key={index} className="flex-shrink-0 w-full h-full">
                <img
                  src={image}
                  alt={`${alt} - Imagem ${index + 1}`}
                  className={cn("w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity", className)}
                  onClick={() => handleImageClick(index)}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Botões de navegação */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white border-none h-10 w-10 z-30 shadow-lg opacity-80 hover:opacity-100 transition-all duration-200 rounded-full"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white border-none h-10 w-10 z-30 shadow-lg opacity-80 hover:opacity-100 transition-all duration-200 rounded-full"
              onClick={scrollNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Indicadores de pontos */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    index === currentIndex 
                      ? "bg-white" 
                      : "bg-white/50 hover:bg-white/70"
                  )}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Indicador de quantidade de imagens */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-20">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
      
      {/* Modal de visualização */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        images={images}
        currentIndex={currentModalIndex}
        onPrevious={handleModalPrevious}
        onNext={handleModalNext}
        alt={alt}
      />
    </>
  );
};