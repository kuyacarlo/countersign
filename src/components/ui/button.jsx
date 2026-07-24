const variants = {
  default: "bg-[#c4a882] text-[#0d0c0b] hover:bg-[#d4b892]",
  outline: "border border-[#252320] bg-transparent text-[#f0ede6] hover:bg-[#141312]",
  ghost: "bg-transparent text-[#888480] hover:text-[#f0ede6]",
};

export function Button({
  className = "",
  variant = "default",
  type = "button",
  disabled,
  children,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
