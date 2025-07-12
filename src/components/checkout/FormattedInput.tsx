import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormattedInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'cpf' | 'phone' | 'cep' | 'card' | 'expiry' | 'cvv' | 'text' | 'email';
  className?: string;
}

const FormattedInput = ({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder, 
  required, 
  type = 'text',
  className 
}: FormattedInputProps) => {
  
  const formatValue = (input: string, formatType: string) => {
    const cleaned = input.replace(/\D/g, '');
    
    switch (formatType) {
      case 'cpf':
        return cleaned
          .slice(0, 11)
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      
      case 'phone':
        return cleaned
          .slice(0, 11)
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{5})(\d)/, '$1-$2');
      
      case 'cep':
        return cleaned
          .slice(0, 8)
          .replace(/(\d{5})(\d)/, '$1-$2');
      
      case 'card':
        return cleaned
          .slice(0, 16)
          .replace(/(\d{4})(?=\d)/g, '$1 ');
      
      case 'expiry':
        return cleaned
          .slice(0, 6)
          .replace(/(\d{2})(\d)/, '$1/$2');
      
      case 'cvv':
        return cleaned.slice(0, 4);
      
      default:
        return input;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'text' || type === 'email' 
      ? e.target.value 
      : formatValue(e.target.value, type);
    onChange(newValue);
  };

  const getInputType = () => {
    return type === 'email' ? 'email' : 'text';
  };

  return (
    <div className={className}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={getInputType()}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="mt-1"
      />
    </div>
  );
};

export default FormattedInput;