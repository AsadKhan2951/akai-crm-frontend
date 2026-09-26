import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "border-transparent bg-ink text-white hover:bg-[#2b2f37]",
      destructive: "border-transparent bg-bad text-white hover:bg-[#9a1d13]",
      outline: "border-line bg-surface text-ink hover:bg-sunken",
      secondary: "border-transparent bg-[#f1f0ec] text-ink hover:bg-[#e8e7e2]",
      ghost: "border-transparent bg-transparent text-ink hover:bg-[#f0efeb]",
      link: "border-transparent text-brand underline-offset-4 hover:underline"
    },
    size: { default: "h-10 px-4", sm: "h-9 px-3 text-[13px]", lg: "h-12 px-6", icon: "h-10 w-10" }
  },
  defaultVariants: { variant: "default", size: "default" }
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
export { Button, buttonVariants };
