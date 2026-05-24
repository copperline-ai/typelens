"use client";
import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TruncatedFieldNameProps {
  name: string;
  className?: string;
}

export function TruncatedFieldName({ name, className }: TruncatedFieldNameProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  const isTruncated = () => {
    const el = spanRef.current;
    return el ? el.scrollWidth > el.offsetWidth : false;
  };

  const handleClick = () => {
    if (isTruncated()) setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span ref={spanRef} className={className} onClick={handleClick}>
          {name}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-sm break-all font-mono text-xs p-2">
        {name}
      </PopoverContent>
    </Popover>
  );
}
