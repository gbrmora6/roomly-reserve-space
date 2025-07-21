
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";

interface Photo {
  id: string;
  url: string;
}

interface PhotoManagerProps {
  photos: Photo[];
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onRemovePhoto: (photoId: string) => void;
  title?: string;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({
  photos,
  files,
  onFileChange,
  onRemoveFile,
  onRemovePhoto,
  title = "Fotos"
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img 
                  src={photo.url} 
                  alt="Foto" 
                  className="w-full h-32 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemovePhoto(photo.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {files.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={`Pré-visualização ${index}`} 
                  className="w-full h-32 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div>
          <Label htmlFor="photos" className="cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center hover:border-gray-400 transition-colors">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Clique para selecionar ou arraste as fotos aqui
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, GIF até 10MB
              </p>
            </div>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={onFileChange}
              className="hidden"
            />
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};
