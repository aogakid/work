import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link?.href) return;

      const url = new URL(link.href);
      if (url.origin !== location.origin) return;
      if (!document.startViewTransition) return;

      e.preventDefault();
      document.startViewTransition(() => {
        router.push(url.pathname);
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [router]);

  return <Component {...pageProps} />;
}