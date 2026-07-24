import { forwardRef } from "react";

const Input = forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`flex h-9 w-full rounded-md border border-[#3a3732] bg-[#141312] px-3 py-1 text-sm text-[#f0ede6] shadow-sm transition-colors placeholder:text-[#b0aba3] placeholder:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4a882] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
));

Input.displayName = "Input";

export { Input };
