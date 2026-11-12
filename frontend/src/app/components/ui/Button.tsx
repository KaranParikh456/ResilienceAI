// src/app/components/ui/Button.tsx
'use client';

import * as React from "react";

interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={`px-4 py-2 rounded-lg transition duration-150 ${
        className || "bg-paypal text-white hover:bg-paypal/90"
      }`}
      {...props}
    />
  )
);

Button.displayName = "Button";
