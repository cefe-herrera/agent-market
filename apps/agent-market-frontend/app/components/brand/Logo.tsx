import Link from "next/link";

type LogoProps = {
  className?: string;
};

export default function Logo({ className = "" }: LogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center no-underline ${className}`}
      aria-label="agent"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 52"
        fill="none"
        aria-hidden="true"
        className="h-7 w-auto"
      >
        <path fill="currentColor" d="M8 46V32L42 8V16L26 32V46H8Z" />
        <text
          x="54"
          y="38"
          fill="currentColor"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
          fontSize="34"
          fontWeight="700"
          letterSpacing="-0.02em"
        >
          agent
        </text>
      </svg>
    </Link>
  );
}
