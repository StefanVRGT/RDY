import Image from 'next/image';

export function RdyFooter() {
  return (
    <div className="mt-auto pt-8 pb-6 text-center">
      <Image
        src="/images/tingsha-bells.svg"
        alt="Tingsha bells"
        width={96}
        height={58}
        className="mx-auto mb-3 h-12 w-auto opacity-70"
      />
      <p className="text-lg font-bold tracking-widest text-rdy-black">RDY</p>
    </div>
  );
}
