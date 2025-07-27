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

  return (
    <section ref={sectionRef} className="py-16 bg-gradient-to-br from-background to-secondary/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-lg bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${stat.color} text-white mb-4`}>
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                {stat.value}{stat.suffix}
              </div>
              <div className="text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default StatsSection;