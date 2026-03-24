"use client";

import { useState } from "react";

type HideOnErrorImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export default function HideOnErrorImage({ src, alt, className }: HideOnErrorImageProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden || !src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHidden(true)}
      loading="lazy"
    />
  );
}
