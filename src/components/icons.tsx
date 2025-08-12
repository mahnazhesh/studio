import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 15.5L21 3l-5.5 8.5" />
      <path d="M10 14l-7-11 5.5 8.5" />
      <path d="M14.5 15.5L12 21l-2-5.5" />
    </svg>
  );
}
