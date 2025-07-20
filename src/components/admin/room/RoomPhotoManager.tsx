import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";

interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
}

interface RoomPhotoManagerProps {
  photos: RoomPhoto[];
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onRemovePhoto: (photoId: string) => void;
}

export const RoomPhotoManager: React.FC<RoomPhotoManagerProps> = ({
  photos,
  files,
  onFileChange,
  onRemoveFile,
  onRemovePhoto,
}) => {
  return (
    <div className="space-y-4">
      <Label>Fotos da Sala</Label>
      
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img 
                src={photo.url} 
                alt="Foto da sala" 
                className="w-full h-32 object-cover rounded-md"
              />
              <Button
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
        <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <img 
                src={URL.createObjectURL(file)} 
                alt={`Pré-visualização ${index}`} 
                className="w-full h-32 object-cover rounded-md"
              />
              <Button
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
      
      <div className="mt-2">
        <Label htmlFor="photos" className="cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center">
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
    </div>
  );
};