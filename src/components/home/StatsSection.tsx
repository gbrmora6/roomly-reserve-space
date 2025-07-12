import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, Star, MapPin } from "lucide-react";

const StatsSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [counts, setCounts] = useState({ locations: 0, clients: 0, rating: 0, bookings: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  const targetCounts = {
    locations: 8,
    clients: 1250,
    rating: 4.9,
    bookings: 5800
  };

  useEffect(() => {
    const currentSection = sectionRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

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

  const stats = [
    {
      icon: <MapPin className="w-8 h-8" />,
      value: counts.locations,
      label: "Filiais",
      suffix: "",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      value: counts.clients,
      label: "Profissionais Atendidos",
      suffix: "+",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Star className="w-8 h-8" />,
      value: counts.rating,
      label: "Avaliação Média",
      suffix: "/5",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      value: counts.bookings,
      label: "Reservas Realizadas",
      suffix: "+",
      color: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Números que Impressionam
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Nossa trajetória de sucesso em números que refletem a confiança dos profissionais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`relative group transform transition-all duration-700 hover:scale-105 ${
                isVisible ? 'animate-fade-in' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden">
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
                
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} text-white mb-6 shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:scale-110`}>
                  {stat.icon}
                </div>

                {/* Number */}
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {typeof stat.value === 'number' && stat.value % 1 !== 0 
                    ? stat.value.toFixed(1) 
                    : stat.value.toLocaleString()
                  }
                  <span className="text-2xl text-gray-600">{stat.suffix}</span>
                </div>

                {/* Label */}
                <div className="text-gray-600 font-medium">{stat.label}</div>

                {/* Decorative element */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;