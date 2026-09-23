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
      {/* Plain img avoids Next.js image optimizer cache on logo updates */}
      <img
        src="/brand/agent-logo.png"
        alt="agent"
        width={512}
        height={128}
        decoding="async"
        className="h-7 w-auto"
      />
    </Link>
  );
}
