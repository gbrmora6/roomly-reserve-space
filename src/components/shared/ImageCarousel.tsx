import React, { useRef, useCallback, useState } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModalIndex, setCurrentModalIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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
        <div className="embla" ref={emblaRef}>
          <div className="embla__container flex">
            {images.map((image, index) => (
              <div key={index} className="embla__slide flex-[0_0_100%] min-w-0">
                <img
                  src={image}
                  alt={`${alt} - Imagem ${index + 1}`}
                  className={cn("w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity", className)}
                  onClick={() => handleImageClick(index)}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Botões de navegação */}
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
        
        {/* Indicador de quantidade de imagens */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-20">
          {images.length} fotos
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