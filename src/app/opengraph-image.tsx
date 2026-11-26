import { site } from "@/config/site";
import { ogImage, ogSize } from "./og";

export const alt = `${site.name}: free file converter for students`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "Free file converter for students", from: "PDF", to: "DOCX" });
}
