
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CartTimerProps {
  expiresAt: string;
  onExpired?: () => void;
}

const CartTimer: React.FC<CartTimerProps> = ({ expiresAt, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;
      
      if (difference <= 0) {
        setTimeLeft(0);
        onExpired?.();
        return 0;
      }
      
      return Math.floor(difference / 1000);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft <= 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Expirado
      </Badge>
    );
  }

  const isUrgent = timeLeft <= 300; // 5 minutos

  return (
    <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-xs">
      <Clock className="h-3 w-3 mr-1" />
      {formatTime(timeLeft)}
    </Badge>
  );
};

export default CartTimer;
