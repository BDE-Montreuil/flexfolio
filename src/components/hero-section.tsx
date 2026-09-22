import Image from "next/image";

interface HeroSectionProps {
  labelLeft: string;
  labelRight: string;
  wordmark: string;
  name: string;
  imageUrl: string | null;
}

export function HeroSection({ labelLeft, labelRight, wordmark, name, imageUrl }: HeroSectionProps) {
  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ");

  return (
    <section className="w-full">
      <div className="flex items-start justify-between px-4 pt-6 sm:px-8">
        <span className="label-eyebrow">{labelLeft}</span>
        <span className="label-eyebrow">{labelRight}</span>
      </div>

      {imageUrl && (
        <div className="relative mt-4 h-[60vh] w-full overflow-hidden rounded-[4px] sm:h-[68vh]">
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-2 px-2 pb-10 pt-10 sm:flex-row sm:items-end sm:px-4 sm:pb-12 sm:pt-12">
        <h1 className="font-serif text-[clamp(3.25rem,15vw,9rem)] font-black leading-[0.85] tracking-tight text-brand-ink">
          {wordmark}
        </h1>
        <div className="pr-2 pb-1 text-right font-sans text-2xl leading-tight text-brand-ink sm:pr-6 sm:text-3xl">
          <p>{firstName}</p>
          {lastName && <p>{lastName}</p>}
        </div>
      </div>
    </section>
  );
}
