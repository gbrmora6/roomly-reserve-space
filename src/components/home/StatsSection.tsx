import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, Star, MapPin } from "lucide-react";
const StatsSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [counts, setCounts] = useState({
    locations: 0,
    clients: 0,
    rating: 0,
    bookings: 0
  });
  const sectionRef = useRef<HTMLDivElement>(null);
  const targetCounts = {
    locations: 8,
    clients: 1250,
    rating: 4.9,
    bookings: 5800
  };
  useEffect(() => {
    const currentSection = sectionRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, {
      threshold: 0.3
    });
    if (currentSection) {
      observer.observe(currentSection);
    }
    return () => {
      if (currentSection) {
        observer.unobserve(currentSection);
      }
    };
  }, []);
  useEffect(() => {
    if (isVisible) {
      const duration = 2000;
      const interval = 50;
      const steps = duration / interval;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const easeOutProgress = 1 - Math.pow(1 - progress, 3);
        setCounts({
          locations: Math.round(targetCounts.locations * easeOutProgress),
          clients: Math.round(targetCounts.clients * easeOutProgress),
          rating: Math.round(targetCounts.rating * easeOutProgress * 10) / 10,
          bookings: Math.round(targetCounts.bookings * easeOutProgress)
        });
        if (step >= steps) {
          clearInterval(timer);
          setCounts(targetCounts);
        }
      }, interval);
      return () => clearInterval(timer);
    }
  }, [isVisible]);
  const stats = [{
    icon: <MapPin className="w-8 h-8" />,
    value: counts.locations,
    label: "Filiais",
    suffix: "",
    color: "from-blue-500 to-blue-600"
  }, {
    icon: <Users className="w-8 h-8" />,
    value: counts.clients,
    label: "Profissionais Atendidos",
    suffix: "+",
    color: "from-green-500 to-green-600"
  }, {
    icon: <Star className="w-8 h-8" />,
    value: counts.rating,
    label: "Avaliação Média",
    suffix: "/5",
    color: "from-yellow-500 to-yellow-600"
  }, {
    icon: <TrendingUp className="w-8 h-8" />,
    value: counts.bookings,
    label: "Reservas Realizadas",
    suffix: "+",
    color: "from-purple-500 to-purple-600"
  }];
  return;
};
export default StatsSection;