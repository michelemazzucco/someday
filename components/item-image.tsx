import Image from "next/image";
import { publicImageUrl } from "@/lib/images";

type Props = { path: string | null; alt: string; sizes: string; priority?: boolean; compact?: boolean };

export function ItemImage({ path, alt, sizes, priority, compact }: Props) {
  const url = publicImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", path);

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-muted">
        {!compact && <span className="text-xs text-muted-foreground">No image</span>}
      </div>
    );
  }

  return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className="object-contain" />;
}
