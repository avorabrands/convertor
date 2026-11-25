import { cn } from "@/lib/cn";

export const Skeleton = ({ className }: { className?: string }) => <span aria-hidden className={cn("skeleton block", className)} />;
