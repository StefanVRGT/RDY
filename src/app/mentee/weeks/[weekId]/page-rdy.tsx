'use client';

import { useParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { RdyHeader, RdySectionHeader } from '@/components/ui/rdy-header';
import Image from 'next/image';

export default function WeekContentPageRdy() {
  const params = useParams();
  const weekId = params.weekId as string;

  // This would come from your API/database
  const weekData = {
    number: 1,
    title: 'SENSING',
    subtitle: 'SENSING',
    content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam sit amet sollicitudin risus, sed fermentum tellus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Nulla vel sapien sapien, venenatis egestas pede, sed sed velit a maximus nunc. Integer ligula elit, porttitor id mauris. Mauris tempus maximus ut dapibus, ac condimentum ante feugiat. Ut nisi eros, faucibus eu.`,
    imageUrl: '/images/meditation-pose.jpg', // Placeholder
  };

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <button className="p-2 active:opacity-60 transition-opacity" aria-label="Menu">
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Header */}
        <div className="mb-rdy-xl">
          <RdyHeader
            title={`WEEK ${weekData.number}`}
            subtitle={weekData.subtitle}
          />
        </div>

        {/* Section Title */}
        <div className="mb-rdy-lg">
          <RdySectionHeader title={weekData.title} />
        </div>

        {/* Content */}
        <div className="mb-rdy-xl">
          <p className="rdy-body text-center leading-relaxed">{weekData.content}</p>
        </div>

        {/* Image */}
        <div className="mb-rdy-xl">
          <div className="relative w-full aspect-[4/3] bg-rdy-gray-100">
            {/* Placeholder for meditation image */}
            <div className="flex items-center justify-center h-full">
              <p className="text-rdy-gray-400 text-sm">Meditation Image</p>
            </div>
          </div>
        </div>

        {/* RDY Branding */}
        <div className="text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
