import Image, { type ImageProps } from "next/image";
import {
  OFFICIAL_RLCA_LOGO_HEIGHT,
  OFFICIAL_RLCA_LOGO_PATH,
  OFFICIAL_RLCA_LOGO_WIDTH,
} from "@/services/brand-assets";
import { RLCA_FULL_NAME } from "@/services/brand";

export function RlcaLogo({
  decorative = false,
  alt,
  ...props
}: Omit<ImageProps, "src" | "width" | "height" | "alt"> & {
  decorative?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src={OFFICIAL_RLCA_LOGO_PATH}
      width={OFFICIAL_RLCA_LOGO_WIDTH}
      height={OFFICIAL_RLCA_LOGO_HEIGHT}
      alt={decorative ? "" : alt ?? `${RLCA_FULL_NAME} logo`}
      {...props}
    />
  );
}
